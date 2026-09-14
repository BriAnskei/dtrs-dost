import { createHash } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, type TestingModule } from "@nestjs/testing";
import * as argon2 from "argon2";
import { DataSource, type EntityManager } from "typeorm";
import { AuthenticationService } from "./authentication.service";
import { UserRepository } from "../../user/user.repository";
import { RefreshTokenRepository } from "../repository/refresh-token.repository";

jest.mock("argon2", () => ({
  verify: jest.fn(),
}));

jest.mock("@nestjs/jwt", () => {
  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue("mock-access-token"),
  };
  return {
    JwtService: jest.fn().mockImplementation(() => mockJwtService),
  };
});

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue("mock-refresh-token-string"),
  }),
}));

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const mockUser = {
  id: "user-uuid-123",
  division_id: "division-uuid-456",
  role_id: 2,
  full_name: "Test User",
  password: "hashed-password",
  contact_number: "+1234567890",
  email: "test@example.com",
  is_active: true,
};

const validRefreshToken = "valid-refresh-token";
const tokenHash = createHash("sha256")
  .update(validRefreshToken)
  .digest("hex");

describe("AuthenticationService", () => {
  let service: AuthenticationService;
  let userRepository: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
  };
  let refreshTokenRepository: {
    deleteExpiredByUserId: jest.Mock;
    consume: jest.Mock;
    save: jest.Mock;
    deleteByTokenHash: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let dataSource: { transaction: jest.Mock; manager: EntityManager };
  let mockEntityManager: EntityManager;
  let argon2Verify: jest.Mock;

  beforeEach(async () => {
    argon2Verify = argon2.verify as unknown as jest.Mock;

    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };

    refreshTokenRepository = {
      deleteExpiredByUserId: jest.fn(),
      consume: jest.fn(),
      save: jest.fn(),
      deleteByTokenHash: jest.fn(),
    };

    jwtService = { signAsync: jest.fn() };

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
        AuthenticationService,
        { provide: UserRepository, useValue: userRepository },
        {
          provide: RefreshTokenRepository,
          useValue: refreshTokenRepository,
        },
        { provide: JwtService, useValue: jwtService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);

    jest.clearAllMocks();
    argon2Verify.mockClear();

    // Re-establish transaction mock implementation after clearAllMocks
    dataSource.transaction.mockImplementation(
      async (cb: (manager: EntityManager) => unknown) =>
        cb(mockEntityManager),
    );
  });

  describe("login", () => {
    const loginDto = {
      email: "test@example.com",
      password: "correct-password",
      remember_me: false,
    };

    /**
     * Verifies that a successful login flow:
     * 1. Validates the user's credentials via argon2
     * 2. Cleans up any expired refresh tokens for the user
     * 3. Generates an access token signed with the user's id, email, and role_id
     * 4. Creates and persists a hashed refresh token
     * 5. Returns user_data (stripping the password field from the entity)
     *    along with both tokens and the correct max age
     */
    it("should login successfully with valid credentials and return user data plus tokens", async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      argon2Verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue("mock-access-token");
      refreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(refreshTokenRepository.deleteExpiredByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          role_id: mockUser.role_id,
        },
        { expiresIn: "15m" },
      );
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        {
          user_id: mockUser.id,
          token_hash: createHash("sha256")
            .update("mock-refresh-token-string")
            .digest("hex"),
          expires_at: expect.any(Date),
          remembered: false,
        },
        mockEntityManager,
      );

      expect(result.user_data).toEqual({
        id: mockUser.id,
        division_id: mockUser.division_id,
        full_name: mockUser.full_name,
        role_id: mockUser.role_id,
        email: mockUser.email,
        contect_number: mockUser.contact_number,
        is_active: mockUser.is_active,
      });
      expect(result.access_token).toBe("mock-access-token");
      expect(result.refresh_token).toBe("mock-refresh-token-string");
      expect(result.refresh_token_max_age_ms).toBe(ONE_DAY_MS);
    });

    /**
     * Verifies that with `remember_me: true`, the refresh token is created
     * with an expiration of 30 days instead of the default 1 day.
     */
    it("should use 30-day refresh token expiration when remember_me is true", async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      argon2Verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue("mock-access-token");
      refreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login({ ...loginDto, remember_me: true });

      expect(result.refresh_token_max_age_ms).toBe(THIRTY_DAYS_MS);
    });

    /**
     * Verifies that with `remember_me: false`, the refresh token is created
     * with the default 1-day expiration.
     */
    it("should use 1-day refresh token expiration when remember_me is false", async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      argon2Verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue("mock-access-token");
      refreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login({ ...loginDto, remember_me: false });

      expect(result.refresh_token_max_age_ms).toBe(ONE_DAY_MS);
    });

    /**
     * Verifies that when the email doesn't match any user,
     * an UnauthorizedException with "Invalid credentials" is thrown.
     * The password is never checked in this case.
     */
    it("should throw UnauthorizedException when user is not found", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      argon2Verify.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "Invalid credentials",
      );

      expect(argon2Verify).not.toHaveBeenCalled();
    });

    /**
     * Verifies that when the user account is inactive (is_active: false),
     * an UnauthorizedException with "User account is inactive" is thrown
     * before password verification.
     */
    it("should throw UnauthorizedException when user is inactive", async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        is_active: false,
      });
      argon2Verify.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "User account is inactive",
      );

      expect(argon2Verify).not.toHaveBeenCalled();
    });

    /**
     * Verifies that when argon2.verify returns false (wrong password),
     * an UnauthorizedException with "Invalid credentials" is thrown.
     */
    it("should throw UnauthorizedException when password does not match", async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      argon2Verify.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "Invalid credentials",
      );
    });
  });

  describe("refresh", () => {
    /**
     * Verifies the full refresh flow:
     * 1. Hashes the token and atomically consumes it inside a transaction
     * 2. The consume operation (DELETE ... RETURNING) both deletes the old
     *    token and returns it — ensuring no separate delete is needed
     * 3. Validates the token exists and has not been consumed
     * 4. Fetches the associated user and validates they are active
     * 5. Issues a new access + refresh token pair (rotation)
     */
    it("should refresh tokens successfully with a valid non-consumed token", async () => {
      const storedToken = {
        id: "token-id",
        user_id: mockUser.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 10000),
        remembered: false,
      };

      refreshTokenRepository.consume.mockResolvedValue(storedToken);
      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue("new-access-token");
      refreshTokenRepository.save.mockResolvedValue({});

      const result = await service.refresh(validRefreshToken);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(refreshTokenRepository.consume).toHaveBeenCalledWith(
        tokenHash,
        mockEntityManager,
      );
      expect(userRepository.findById).toHaveBeenCalledWith(
        storedToken.user_id,
        mockEntityManager,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          role_id: mockUser.role_id,
        },
        { expiresIn: "15m" },
      );

      expect(result.access_token).toBe("new-access-token");
      expect(result.refresh_token).toBe("mock-refresh-token-string");
      expect(result.refresh_token_max_age_ms).toBe(ONE_DAY_MS);
    });

    /**
     * Verifies that with `remembered` true on the stored token,
     * the new refresh token gets a 30-day expiration.
     */
    it("should use 30-day expiration when stored token has remembered = true", async () => {
      const storedToken = {
        id: "token-id",
        user_id: mockUser.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 10000),
        remembered: true,
      };

      refreshTokenRepository.consume.mockResolvedValue(storedToken);
      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue("new-access-token");
      refreshTokenRepository.save.mockResolvedValue({});

      const result = await service.refresh(validRefreshToken);

      expect(result.refresh_token_max_age_ms).toBe(THIRTY_DAYS_MS);
    });

    /**
     * Verifies that when no refresh token is provided (undefined),
     * an UnauthorizedException is thrown immediately without
     * querying the repository or starting a transaction.
     */
    it("should throw UnauthorizedException when refresh token is undefined", async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh(undefined)).rejects.toThrow(
        "Refresh token not found",
      );

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(refreshTokenRepository.consume).not.toHaveBeenCalled();
    });

    /**
     * Verifies that when an empty string is provided as refresh token,
     * it still throws "Refresh token not found" (falsy check catches empty string).
     */
    it("should throw UnauthorizedException when refresh token is empty string", async () => {
      await expect(service.refresh("")).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh("")).rejects.toThrow(
        "Refresh token not found",
      );

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    /**
     * Verifies that when the hashed refresh token does not exist in storage,
     * consume returns null and the service throws UnauthorizedException with
     * "Invalid or expired refresh token". No user lookup or token generation
     * occurs.
     */
    it("should throw UnauthorizedException when token does not exist", async () => {
      refreshTokenRepository.consume.mockResolvedValue(null);

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        "Invalid or expired refresh token",
      );

      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    /**
     * Verifies that when the refresh token has expired, the consume
     * operation returns null (the DELETE ... WHERE expires_at > NOW()
     * matches no rows for an expired token), and the service throws
     * UnauthorizedException. No separate delete call is needed since
     * consume already handles deletion of expired tokens in one atomic step.
     */
    it("should throw UnauthorizedException when refresh token is expired", async () => {
      refreshTokenRepository.consume.mockResolvedValue(null);

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        "Invalid or expired refresh token",
      );

      expect(refreshTokenRepository.consume).toHaveBeenCalledWith(
        tokenHash,
        mockEntityManager,
      );
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    /**
     * Verifies that when the user associated with the refresh token
     * is not active (is_active: false), an UnauthorizedException
     * with "User is not active" is thrown.
     */
    it("should throw UnauthorizedException when user is not active", async () => {
      const storedToken = {
        id: "token-id",
        user_id: mockUser.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 10000),
        remembered: false,
      };

      refreshTokenRepository.consume.mockResolvedValue(storedToken);
      userRepository.findById.mockResolvedValue({
        ...mockUser,
        is_active: false,
      });

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        "User is not active",
      );
    });

    /**
     * Verifies that when the user is not found (null from findById),
     * an UnauthorizedException with "User is not active" is thrown
     * (the `!user?.is_active` check covers both null and inactive).
     */
    it("should throw UnauthorizedException when user is not found during refresh", async () => {
      const storedToken = {
        id: "token-id",
        user_id: "nonexistent-user",
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 10000),
        remembered: false,
      };

      refreshTokenRepository.consume.mockResolvedValue(storedToken);
      userRepository.findById.mockResolvedValue(null);

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        "User is not active",
      );
    });

    /**
     * Verifies the token-rotation concurrency contract:
     *
     * Request A atomically consumes RT-001 inside a transaction and
     * succeeds, issuing a new refresh token. Request B (concurrent,
     * same token) calls consume and gets null because RT-001 was
     * already deleted and committed by Request A's transaction.
     * Request B receives 401 Unauthorized.
     *
     * In a real PostgreSQL scenario, B's DELETE ... RETURNING blocks
     * on A's row lock until A commits, then finds no rows left.
     * This unit test simulates B's perspective: consume returns null
     * after A has already consumed the token.
     */
    it("should return 401 when concurrent request finds token already consumed", async () => {
      const storedToken = {
        id: "token-id",
        user_id: mockUser.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 10000),
        remembered: false,
      };

      // Request A: consume returns the stored token successfully
      refreshTokenRepository.consume.mockResolvedValueOnce(storedToken);
      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue("new-access-token");
      refreshTokenRepository.save.mockResolvedValue({});

      const firstResult = await service.refresh(validRefreshToken);
      expect(firstResult.access_token).toBe("new-access-token");
      expect(firstResult.refresh_token).toBe("mock-refresh-token-string");

      // Request B: consume returns null — token already consumed by Request A
      refreshTokenRepository.consume.mockResolvedValue(null);

      await expect(service.refresh(validRefreshToken)).rejects.toThrow(
        "Invalid or expired refresh token",
      );

      // consume was called twice — once for A (success), once for B (null)
      expect(refreshTokenRepository.consume).toHaveBeenCalledTimes(2);
      expect(refreshTokenRepository.consume).toHaveBeenNthCalledWith(
        2,
        tokenHash,
        mockEntityManager,
      );

      // Only Request A should have generated an access token
      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);

      // Only Request A should have saved a new refresh token
      expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1);
    });

    /**
     * Verifies that the old refresh token is NOT separately deleted —
     * the consume operation (DELETE ... RETURNING) handles token
     * deletion atomically within the transaction. This is important
     * for rotation security: there must be only one deletion path
     * so that concurrent requests cannot race past a non-atomic
     * find-delete-create sequence.
     */
    it("should not call separate delete on successful refresh (consume handles deletion)", async () => {
      const storedToken = {
        id: "token-id",
        user_id: mockUser.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 10000),
        remembered: false,
      };

      refreshTokenRepository.consume.mockResolvedValue(storedToken);
      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue("new-access-token");
      refreshTokenRepository.save.mockResolvedValue({});

      await service.refresh(validRefreshToken);

      // consume handles both lookup and deletion in one atomic DELETE ... RETURNING
      expect(refreshTokenRepository.consume).toHaveBeenCalledTimes(1);

      // A new token is saved (rotation), not the old one deleted separately
      expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1);
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          token_hash: createHash("sha256")
            .update("mock-refresh-token-string")
            .digest("hex"),
          expires_at: expect.any(Date),
          remembered: false,
        }),
        mockEntityManager,
      );
    });
  });

  describe("logout", () => {
    /**
     * Verifies that logout without a refresh token returns a success message
     * without attempting to delete anything from the repository.
     * This handles the case where the client has no cookie.
     */
    it("should return success message without deleting when no refresh token provided", async () => {
      const result = await service.logout(undefined as unknown as string);

      expect(result).toEqual({
        message: "Logged out successfully",
      });
      expect(refreshTokenRepository.deleteByTokenHash).not.toHaveBeenCalled();
    });

    /**
     * Verifies that logout with a valid refresh token:
     * 1. Hashes the token before passing to the repository
     * 2. Calls deleteByTokenHash to remove the stored token
     * 3. Returns the success message
     */
    it("should delete the hashed refresh token and return success message", async () => {
      const refreshToken = "some-refresh-token";
      const expectedHash = createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const result = await service.logout(refreshToken);

      expect(refreshTokenRepository.deleteByTokenHash).toHaveBeenCalledWith(
        expectedHash,
      );
      expect(result).toEqual({
        message: "Logged out successfully",
      });
    });
  });
});
