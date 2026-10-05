import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { UserService } from "../../../features/user/service/user.service";
import { Role } from "../../authorization/enum/roles.enum";
import { JwtStrategy } from "./jwt.strategy";

/**
 * Mock @nestjs/passport so PassportStrategy returns a no-op class.
 * This lets JwtStrategy be instantiated without a real passport Strategy
 * constructor running.
 */
jest.mock("@nestjs/passport", () => ({
  PassportStrategy: () => class {},
}));

/**
 * Mock passport-jwt so ExtractJwt and Strategy are stubs.
 * JwtStrategy extends PassportStrategy(Strategy) in the class definition
 * but at runtime the base is the no-op class above.
 */
jest.mock("passport-jwt", () => ({
  ExtractJwt: {
    fromExtractors: jest.fn().mockReturnValue(jest.fn()),
  },
  Strategy: class {},
}));

/**
 * Builds a mock UserEntity-like object as returned by
 * UserService.findByIdForAuth.
 *
 * role_id is a string because the DB column is varchar (TypeORM maps
 * it to string). The JwtStrategy calls Number(user.role_id) to compare
 * against the Role enum.
 *
 * `managementPermissions` is the UserManagementPermissionsEntity — it
 * has add/edit/reset_password/deactivate/reactivate/delete booleans
 * but no `view` field (view is synthesized as always-true in the
 * strategy when the Admin+permissions branch is taken).
 */
function buildMockUser(
  roleId: Role,
  isActive = true,
  managementPermissions: {
    add: boolean;
    edit: boolean;
    reset_password: boolean;
    deactivate: boolean;
    reactivate: boolean;
    delete: boolean;
  } | null = null,
) {
  return {
    id: "user-uuid-123",
    email: "test@example.com",
    role_id: String(roleId),
    is_active: isActive,
    user_permissions: managementPermissions
      ? { managementPermissions }
      : managementPermissions === null
        ? null
        : { managementPermissions: undefined },
  };
}

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let userService: { findByIdForAuth: jest.Mock };

  beforeEach(async () => {
    userService = {
      findByIdForAuth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue("test-jwt-secret"),
          },
        },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe("when payload is valid and user is active", () => {
    /**
     * The user has role Admin (2) and a managementPermissions object
     * with specific boolean values. The strategy should:
     * 1. Look up the user by payload.sub
     * 2. Return AuthenticatedUser with:
     *    - role_id as a number (Number(user.role_id))
     *    - permissions.user_management_permissions populated from
     *      managementPermissions with all six fields plus `view: true`
     */
    it("should return user data with permissions for Admin with managementPermissions", async () => {
      const mockUser = buildMockUser(Role.Admin, true, {
        add: true,
        edit: false,
        reset_password: true,
        deactivate: false,
        reactivate: true,
        delete: false,
      });
      userService.findByIdForAuth.mockResolvedValue(mockUser);

      const result = await strategy.validate({ sub: mockUser.id });

      expect(userService.findByIdForAuth).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role_id: Role.Admin,
        permissions: {
          user_management_permissions: {
            view: true,
            add: true,
            edit: false,
            reset_password: true,
            deactivate: false,
            reactivate: true,
            delete: false,
          },
        },
      });
    });

    /**
     * A non-Admin role (e.g. ReceiverOfficer = 3) should get
     * user_management_permissions: null regardless of whether
     * managementPermissions exist on the user_permissions entity.
     *
     * The condition `Number(user.role_id) === Role.Admin` gates the
     * entire permissions block.
     */
    it("should return null permissions for non-Admin user", async () => {
      const mockUser = buildMockUser(Role.ReceiverOfficer, true, {
        add: true,
        edit: true,
        reset_password: true,
        deactivate: true,
        reactivate: true,
        delete: true,
      });
      userService.findByIdForAuth.mockResolvedValue(mockUser);

      const result = await strategy.validate({ sub: mockUser.id });

      expect(result.role_id).toBe(Role.ReceiverOfficer);
      expect(result.permissions.user_management_permissions).toBeNull();
    });
  });

  describe("when Admin user lacks managementPermissions", () => {
    /**
     * Admin user whose user_permissions is null entirely.
     * user_permissions?.managementPermissions is undefined →
     * the ternary condition is falsy → permissions set to null.
     */
    it("should return null permissions when user_permissions is null", async () => {
      const mockUser = buildMockUser(Role.Admin, true, null);
      userService.findByIdForAuth.mockResolvedValue(mockUser);

      const result = await strategy.validate({ sub: mockUser.id });

      expect(result.permissions.user_management_permissions).toBeNull();
    });

    /**
     * Admin user whose user_permissions exists but managementPermissions
     * is undefined (falsy). The condition
     * `user.user_permissions?.managementPermissions` evaluates to falsy
     * → permissions set to null.
     *
     * This is tested by passing `undefined` for managementPermissions
     * (the third argument default path when not string/null).
     */
    it("should return null permissions when managementPermissions is undefined", async () => {
      const mockUser = buildMockUser(Role.Admin, true, undefined);
      userService.findByIdForAuth.mockResolvedValue(mockUser);

      const result = await strategy.validate({ sub: mockUser.id });

      expect(result.permissions.user_management_permissions).toBeNull();
    });
  });

  describe("when payload.sub is invalid", () => {
    /**
     * When payload.sub is undefined, the `if (!payload.sub)` guard fires
     * before any database lookup. No call to findByIdForAuth should occur.
     */
    it("should throw UnauthorizedException when payload.sub is undefined", async () => {
      const payload = { sub: undefined } as unknown as { sub: string };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow("Invalid token payload");

      expect(userService.findByIdForAuth).not.toHaveBeenCalled();
    });

    /**
     * Empty string is falsy — the `if (!payload.sub)` guard catches it.
     */
    it("should throw UnauthorizedException when payload.sub is empty string", async () => {
      await expect(strategy.validate({ sub: "" })).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate({ sub: "" })).rejects.toThrow(
        "Invalid token payload",
      );

      expect(userService.findByIdForAuth).not.toHaveBeenCalled();
    });
  });

  describe("when the user is not found or inactive", () => {
    /**
     * When findByIdForAuth returns null, the `!user` part of the guard
     * condition is true → UnauthorizedException thrown.
     *
     * Message: "User is inactive or not found"
     */
    it("should throw UnauthorizedException when user is not found", async () => {
      userService.findByIdForAuth.mockResolvedValue(null);

      await expect(strategy.validate({ sub: "nonexistent-id" })).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate({ sub: "nonexistent-id" })).rejects.toThrow(
        "User is inactive or not found",
      );

      expect(userService.findByIdForAuth).toHaveBeenCalledWith("nonexistent-id");
    });

    /**
     * When the user exists but is_active is false, the
     * `user && !user.is_active` part of the condition is true
     * → UnauthorizedException thrown.
     */
    it("should throw UnauthorizedException when user is inactive", async () => {
      const mockUser = buildMockUser(Role.Admin, false);
      userService.findByIdForAuth.mockResolvedValue(mockUser);

      await expect(strategy.validate({ sub: mockUser.id })).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate({ sub: mockUser.id })).rejects.toThrow(
        "User is inactive or not found",
      );

      expect(userService.findByIdForAuth).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
