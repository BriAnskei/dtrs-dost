import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { DataSource, type EntityManager } from "typeorm";
import { PasswordResetService } from "./password-reset-token-service";
import { UserRepository } from "../../../features/user/repository/user.repository";
import { PasswordResetRepository } from "../repository/password-reset-token-repository";
import { RefreshTokenRepository } from "../repository/refresh-token.repository";

/**
 * Mock `crypto.randomBytes` so token generation is deterministic.
 * The service calls `randomBytes(32).toString("base64url")`.
 *
 * We also mock `createHash` so that `hashToken` produces a predictable
 * value — this lets us assert exact hash strings in expectations without
 * re-implementing the hashing logic.
 */
jest.mock("crypto", () => {
  const actual = jest.requireActual("crypto");
  return {
    ...actual,
    randomBytes: jest.fn().mockReturnValue({
      toString: jest
        .fn()
        .mockReturnValue("mock-reset-token-string"),
    }),
  };
});

/**
 * Mock `argon2` so that `argon2.hash` returns a fixed string
 * instead of performing an actual expensive hash.
 */
jest.mock("argon2", () => ({
  hash: jest.fn().mockResolvedValue("mock-hashed-password"),
}));

const TOKEN_TTL_MS = 15 * 60 * 1000;

const mockUserId = "user-uuid-123";

const fixedTokenHash = createHash("sha256")
  .update("mock-reset-token-string")
  .digest("hex");

describe("PasswordResetService", () => {
  let service: PasswordResetService;
  let passwordResetRepository: {
    createToken: jest.Mock;
    findByUserId: jest.Mock;
    findByTokenHash: jest.Mock;
    findByTokenHashForUpdate: jest.Mock;
    delete: jest.Mock;
  };
  let userRepository: {
    updatePassword: jest.Mock;
  };
  let refreshTokenRepository: {
    deleteByUserId: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
    manager: EntityManager;
  };
  let mockEntityManager: EntityManager;

  beforeEach(async () => {
    // Clear mock call counts and implementations between tests
    jest.clearAllMocks();

    passwordResetRepository = {
      createToken: jest.fn(),
      findByUserId: jest.fn(),
      findByTokenHash: jest.fn(),
      findByTokenHashForUpdate: jest.fn(),
      delete: jest.fn(),
    };

    userRepository = {
      updatePassword: jest.fn(),
    };

    refreshTokenRepository = {
      deleteByUserId: jest.fn(),
    };

    mockEntityManager = {} as EntityManager;

    dataSource = {
      transaction: jest.fn().mockImplementation(
        async (cb: (manager: EntityManager) => unknown) =>
          cb(mockEntityManager),
      ),
      manager: mockEntityManager,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: PasswordResetRepository,
          useValue: passwordResetRepository,
        },
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        {
          provide: RefreshTokenRepository,
          useValue: refreshTokenRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  // ---------------------------------------------------------------------------
  // createResetRequest
  // ---------------------------------------------------------------------------

  describe("createResetRequest", () => {
    /**
     * Verifies that when no existing reset token is found for the user,
     * a new token is created with:
     * - The raw token returned to caller (not the hash)
     * - The correct 15-minute TTL
     * - A token hash passed to the repository that matches the hash of
     *   the raw token
     */
    it("should create a password reset token when no existing token found", async () => {
      passwordResetRepository.findByUserId.mockResolvedValue(null);
      const expectedExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      const fakeCreatedToken = {
        id: "created-token-id",
        token_hash: fixedTokenHash,
        expires_at: expectedExpiresAt,
        user_id: mockUserId,
        created_at: new Date(),
      };
      passwordResetRepository.createToken.mockResolvedValue(fakeCreatedToken);

      const result = await service.createResetRequest(mockUserId);

      expect(passwordResetRepository.findByUserId).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(randomBytes).toHaveBeenCalledWith(32);
      expect(passwordResetRepository.createToken).toHaveBeenCalledWith(
        mockUserId,
        fixedTokenHash,
        expect.any(Date),
      );
      expect(passwordResetRepository.createToken).toHaveBeenLastCalledWith(
        mockUserId,
        fixedTokenHash,
        expect.objectContaining({
          getTime: expect.any(Function),
        }),
      );

      expect(result.id).toBe("created-token-id");
      expect(result.token).toBe("mock-reset-token-string");
      expect(result.expires_at).toBeInstanceOf(Date);
      expect(result.expires_at.getTime()).toBeCloseTo(
        Date.now() + TOKEN_TTL_MS,
        -2,
      );
    });

    /**
     * Verifies that when an existing reset token already exists for the
     * user, a ConflictException is thrown with the appropriate error code
     * and the existing token's expiration so the caller can inform the user.
     */
    it("should throw ConflictException when a reset token already exists", async () => {
      const existingToken = {
        id: "existing-token-id",
        token_hash: "existing-hash",
        expires_at: new Date(Date.now() + 300_000),
        user_id: mockUserId,
        created_at: new Date(),
      };
      passwordResetRepository.findByUserId.mockResolvedValue(existingToken);

      await expect(service.createResetRequest(mockUserId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createResetRequest(mockUserId)).rejects.toThrow(
        "A password reset request already exists.",
      );

      // createToken should NOT be called since we throw early
      expect(passwordResetRepository.createToken).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findByToken
  // ---------------------------------------------------------------------------

  describe("findByUserId", () => {
    /**
     * Verifies that findByUserId delegates directly to the repository
     * without any additional logic.
     */
    it("should delegate to passwordResetRepository.findByUserId", async () => {
      const mockToken = {
        id: "token-id",
        user_id: mockUserId,
        token_hash: fixedTokenHash,
        expires_at: new Date(Date.now() + 600_000),
        created_at: new Date(),
      };
      passwordResetRepository.findByUserId.mockResolvedValue(mockToken);

      const result = await service.findByUserId(mockUserId);

      expect(passwordResetRepository.findByUserId).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result).toBe(mockToken);
    });

    /**
     * Verifies that null is returned when no token exists for the user.
     */
    it("should return null when no token found for user", async () => {
      passwordResetRepository.findByUserId.mockResolvedValue(null);

      const result = await service.findByUserId(mockUserId);

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByToken
  // ---------------------------------------------------------------------------

  describe("findByToken", () => {
    /**
     * Verifies that when a valid, non-expired token is found:
     * 1. The raw token is hashed before lookup
     * 2. The repository is queried with the hash
     * 3. The token is returned unchanged
     */
    it("should return the token when a valid non-expired token is found", async () => {
      const validToken = {
        id: "token-id",
        user_id: mockUserId,
        token_hash: fixedTokenHash,
        expires_at: new Date(Date.now() + 600_000),
        created_at: new Date(),
      };
      passwordResetRepository.findByTokenHash.mockResolvedValue(validToken);

      const result = await service.findByToken("mock-reset-token-string");

      expect(passwordResetRepository.findByTokenHash).toHaveBeenCalledWith(
        fixedTokenHash,
      );
      expect(result).toBe(validToken);
    });

    /**
     * Verifies that when no token matches the hash, a BadRequestException
     * is thrown with "Invalid or expired reset token".
     */
    it("should throw BadRequestException when token not found in repository", async () => {
      passwordResetRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.findByToken("nonexistent-token")).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.findByToken("nonexistent-token"),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    /**
     * Verifies that when the token exists but has passed its expiration
     * time, a BadRequestException with "Expired password reset link" is
     * thrown — distinct from the "Invalid or expired" message used when
     * the token hash is not found at all.
     */
    it("should throw BadRequestException when token is expired", async () => {
      const expiredToken = {
        id: "expired-token-id",
        user_id: mockUserId,
        token_hash: fixedTokenHash,
        expires_at: new Date(Date.now() - 1000),
        created_at: new Date(),
      };
      passwordResetRepository.findByTokenHash.mockResolvedValue(expiredToken);

      await expect(
        service.findByToken("mock-reset-token-string"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.findByToken("mock-reset-token-string"),
      ).rejects.toThrow("Expired password reset link");
    });
  });

  // ---------------------------------------------------------------------------
  // resetPassword
  // ---------------------------------------------------------------------------

  describe("resetPassword", () => {
    /**
     * Verifies the happy path of the password reset flow:
     * 1. The raw token is hashed before lookup
     * 2. The lookup uses `findByTokenHashForUpdate` inside a transaction
     *    (pessimistic write lock for concurrency safety)
     * 3. argon2 hashes the new password
     * 4. UserRepository.updatePassword is called with the new hash and
     *    the transaction manager
     * 5. All existing refresh tokens for the user are deleted (invalidating
     *    all sessions)
     * 6. The reset token is deleted after use
     */
    it("should reset password, invalidate refresh tokens, and delete reset token on success", async () => {
      const resetToken = {
        id: "token-id",
        user_id: mockUserId,
        token_hash: fixedTokenHash,
        expires_at: new Date(Date.now() + 600_000),
        created_at: new Date(),
      };
      passwordResetRepository.findByTokenHashForUpdate.mockResolvedValue(
        resetToken,
      );
      userRepository.updatePassword.mockResolvedValue(true);
      refreshTokenRepository.deleteByUserId.mockResolvedValue(undefined);
      passwordResetRepository.delete.mockResolvedValue(true);

      const dto = {
        token: "mock-reset-token-string",
        new_password: "newSecurePassword123",
      };

      await service.resetPassword(dto);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(
        passwordResetRepository.findByTokenHashForUpdate,
      ).toHaveBeenCalledWith(fixedTokenHash, mockEntityManager);
      expect(userRepository.updatePassword).toHaveBeenCalledWith(
        mockUserId,
        "mock-hashed-password",
        mockEntityManager,
      );
      expect(refreshTokenRepository.deleteByUserId).toHaveBeenCalledWith(
        mockUserId,
        mockEntityManager,
      );
      expect(passwordResetRepository.delete).toHaveBeenCalledWith(
        "token-id",
        mockEntityManager,
      );
    });

    /**
     * Verifies that when the reset token does not exist in the repository,
     * a BadRequestException is thrown. No password update, refresh token
     * deletion, or reset token deletion should occur.
     */
    it("should throw BadRequestException when reset token not found", async () => {
      passwordResetRepository.findByTokenHashForUpdate.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: "nonexistent-token",
          new_password: "newSecurePassword123",
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword({
          token: "nonexistent-token",
          new_password: "newSecurePassword123",
        }),
      ).rejects.toThrow("Invalid or expired password reset link");

      expect(userRepository.updatePassword).not.toHaveBeenCalled();
      expect(refreshTokenRepository.deleteByUserId).not.toHaveBeenCalled();
    });

    /**
     * Verifies that when the reset token exists but is expired,
     * the service throws BadRequestException with the "Invalid or expired"
     * message, and also proactively deletes the expired token so it does
     * not linger in the database.
     */
    it("should throw BadRequestException when reset token is expired and delete the expired token", async () => {
      const expiredToken = {
        id: "expired-token-id",
        user_id: mockUserId,
        token_hash: fixedTokenHash,
        expires_at: new Date(Date.now() - 5000),
        created_at: new Date(),
      };
      passwordResetRepository.findByTokenHashForUpdate.mockResolvedValue(
        expiredToken,
      );
      passwordResetRepository.delete.mockResolvedValue(true);

      await expect(
        service.resetPassword({
          token: "mock-reset-token-string",
          new_password: "newSecurePassword123",
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword({
          token: "mock-reset-token-string",
          new_password: "newSecurePassword123",
        }),
      ).rejects.toThrow("Invalid or expired password reset link");

      // The expired token should be cleaned up — the service calls delete
      // with just the id (no manager) in this code path
      expect(passwordResetRepository.delete).toHaveBeenCalledWith(
        "expired-token-id",
      );

      expect(userRepository.updatePassword).not.toHaveBeenCalled();
      expect(refreshTokenRepository.deleteByUserId).not.toHaveBeenCalled();
    });

    /**
     * Verifies that when UserRepository.updatePassword returns false
     * (no matching user row was updated), a NotFoundException is thrown
     * with "User does not exist".
     */
    it("should throw NotFoundException when user is not found during password update", async () => {
      const resetToken = {
        id: "token-id",
        user_id: "nonexistent-user-id",
        token_hash: fixedTokenHash,
        expires_at: new Date(Date.now() + 600_000),
        created_at: new Date(),
      };
      passwordResetRepository.findByTokenHashForUpdate.mockResolvedValue(
        resetToken,
      );
      userRepository.updatePassword.mockResolvedValue(false);

      await expect(
        service.resetPassword({
          token: "mock-reset-token-string",
          new_password: "newSecurePassword123",
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.resetPassword({
          token: "mock-reset-token-string",
          new_password: "newSecurePassword123",
        }),
      ).rejects.toThrow("User does not exist");
    });

    /**
     * Verifies that when the reset token is expired, findByTokenHashForUpdate
     * returns null (the pessimistic query includes an `expires_at > NOW()`
     * guard), and the service treats it as "invalid or expired" — meaning
     * no separate delete is needed since the token was already evicted by
     * the query or is expired.
     */
    it("should treat null result from findByTokenHashForUpdate as expired (no separate delete of null token)", async () => {
      passwordResetRepository.findByTokenHashForUpdate.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: "expired-token",
          new_password: "newSecurePassword123",
        }),
      ).rejects.toThrow("Invalid or expired password reset link");

      // No token to delete since findByTokenHashForUpdate returned null
      expect(passwordResetRepository.delete).not.toHaveBeenCalledWith(
        undefined,
        mockEntityManager,
      );
      expect(passwordResetRepository.delete).not.toHaveBeenCalledWith(
        null,
        mockEntityManager,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe("delete", () => {
    /**
     * Verifies that the standalone `delete` method calls the repository
     * with just the id (no manager), and throws if the repository reports
     * the token was not found (delete returned false).
     */
    it("should delete token by id when repository returns true", async () => {
      passwordResetRepository.delete.mockResolvedValue(true);

      await service.delete("token-to-delete");

      expect(passwordResetRepository.delete).toHaveBeenCalledWith(
        "token-to-delete",
      );
    });

    /**
     * Verifies that when the repository returns false (no row deleted),
     * a generic Error is thrown with "Password token not found".
     */
    it("should throw Error when repository returns false (token not found)", async () => {
      passwordResetRepository.delete.mockResolvedValue(false);

      await expect(service.delete("nonexistent-token")).rejects.toThrow(
        "Password token not found",
      );
      await expect(service.delete("nonexistent-token")).rejects.toThrow(Error);
    });
  });
});
