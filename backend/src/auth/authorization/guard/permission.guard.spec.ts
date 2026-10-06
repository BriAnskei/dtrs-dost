import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import { PermissionsGuard } from "./permission.guard";
import { PERMISSION_KEY } from "../decorator/permissions.decorator";
import { PermissionDomain } from "../enum/permission-domain.enum";
import { Role } from "../enum/roles.enum";
import type { AuthenticatedUser } from "../../authentication/types/authenticated-user";

/**
 * Helper: creates a mock ExecutionContext whose HTTP request carries
 * the given authenticated user.
 *
 * PermissionsGuard calls:
 *   1. context.getHandler() / context.getClass() — passed to Reflector
 *   2. context.switchToHttp().getRequest<AuthenticatedRequest>() — to read request.user
 *
 * We stub all three so the guard runs without a real NestJS HTTP pipeline.
 */
function createMockContext(user: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue(jest.fn()),
    getClass: jest.fn().mockReturnValue(jest.fn()),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user,
      }),
    }),
  } as unknown as ExecutionContext;
}

/**
 * Helper: builds an AuthenticatedUser with the given role and
 * optional management-permission matrix.
 *
 * `permissions.user_management_permissions` is what the guard reads
 * when the RequiredPermission domain is PermissionDomain.UserManagement.
 */
function buildUser(
  role: Role,
  managementPermissions: Record<string, boolean> | null,
): AuthenticatedUser {
  return {
    id: "user-uuid-123",
    email: "user@example.com",
    role_id: role,
    permissions: {
      user_management_permissions: managementPermissions,
    },
  } as AuthenticatedUser;
}

describe("PermissionsGuard", () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsGuard, { provide: Reflector, useValue: reflector }],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
  });

  describe("when no permission decorator is present on the route", () => {
    /**
     * When no @RequirePermission() decorator is applied, the reflector
     * returns undefined. The guard should short-circuit and return true
     * — the endpoint is accessible without a specific permission check.
     *
     * It also verifies that getAllAndOverride is called with the correct
     * PERMISSION_KEY and the handler/class array from the execution context.
     */
    it("should return true when no permission metadata is set", () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const user = buildUser(Role.ReceiverOfficer, null);
      const context = createMockContext(user);

      expect(guard.canActivate(context)).toBe(true);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });
  });

  describe("when the user is a SuperAdmin", () => {
    /**
     * SuperAdmin (role_id === 1) bypasses all permission checks.
     * The guard returns true immediately after confirming the role,
     * regardless of what permissions the user has (or doesn't have).
     *
     * Even if the user's permissions object is null, a SuperAdmin
     * still passes — this is the intended administrative override.
     */
    it("should return true for SuperAdmin regardless of permissions", () => {
      const requiredPermission = {
        domain: PermissionDomain.UserManagement,
        permission: "delete",
      };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);

      const superAdmin = buildUser(Role.SuperAdmin, null);
      const context = createMockContext(superAdmin);

      expect(guard.canActivate(context)).toBe(true);
    });

    /**
     * SuperAdmin with a populated permissions object and a permission
     * that would be false for a normal user — still passes.
     */
    it("should return true for SuperAdmin even when permission would be denied for others", () => {
      const requiredPermission = {
        domain: PermissionDomain.UserManagement,
        permission: "delete",
      };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);

      const superAdmin = buildUser(Role.SuperAdmin, {
        view: true,
        add: true,
        edit: true,
        reset_password: true,
        deactivate: true,
        reactivate: true,
        delete: true,
      });
      const context = createMockContext(superAdmin);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe("when the user's permissions object is null", () => {
    /**
     * The RequiredPermission specifies a domain (e.g. "user_management_permissions")
     * that maps to user.permissions[domain]. When that value is null —
     * meaning the user has no permission set for that domain at all —
     * the guard throws ForbiddenException with "access this resource".
     *
     * This is the case for non-Admin users whose permissions object
     * is null (set to null by JwtStrategy when role_id !== Role.Admin).
     */
    it("should throw ForbiddenException when permissions for domain are null", () => {
      const requiredPermission = {
        domain: PermissionDomain.UserManagement,
        permission: "view",
      };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);

      const userWithNullPerms = buildUser(Role.ReceiverOfficer, null);
      const context = createMockContext(userWithNullPerms);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        "You do not have permission to access this resource",
      );
    });
  });

  describe("when the specific permission is denied (false/unset)", () => {
    /**
     * The permissions object exists for the domain, but the specific
     * permission being checked (e.g. "delete") is false on the user's
     * permission matrix. The guard throws ForbiddenException with
     * "perform this action".
     */
    it("should throw ForbiddenException when the required permission is false", () => {
      const requiredPermission = {
        domain: PermissionDomain.UserManagement,
        permission: "delete",
      };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);

      const userWithoutDelete = buildUser(Role.Admin, {
        view: true,
        add: false,
        edit: false,
        reset_password: false,
        deactivate: false,
        reactivate: false,
        delete: false,
      });
      const context = createMockContext(userWithoutDelete);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        "You do not have permission to perform this action",
      );
    });

    /**
     * The permissions object exists but the requested permission key
     * is not present (undefined on the Record). In JavaScript/TypeScript,
     * accessing a missing key returns undefined, which is falsy — so the
     * guard treats it the same as an explicit false.
     */
    it("should throw ForbiddenException when the required permission is undefined", () => {
      const requiredPermission = {
        domain: PermissionDomain.UserManagement,
        permission: "delete",
      };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);

      const userWithMissingKey = buildUser(Role.Admin, {
        view: true,
        add: true,
        edit: true,
        reset_password: true,
        deactivate: true,
        reactivate: true,
        // 'delete' is intentionally missing
      } as unknown as Record<string, boolean>);

      const context = createMockContext(userWithMissingKey);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        "You do not have permission to perform this action",
      );
    });
  });

  describe("when the user has the required permission", () => {
    /**
     * Happy path: the user has a populated permissions object for the
     * required domain and the specific permission is true. The guard
     * returns true, granting access.
     */
    it("should return true when the required permission is true", () => {
      const requiredPermission = {
        domain: PermissionDomain.UserManagement,
        permission: "view",
      };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);

      const userWithView = buildUser(Role.Admin, {
        view: true,
        add: false,
        edit: false,
        reset_password: false,
        deactivate: false,
        reactivate: false,
        delete: false,
      });
      const context = createMockContext(userWithView);

      expect(guard.canActivate(context)).toBe(true);
    });

    /**
     * Happy path with a different permission key — verifies the guard
     * looks up the correct field by the `permission` string from metadata,
     * not a hardcoded key.
     */
    it("should return true for 'deactivate' permission when it is true", () => {
      const requiredPermission = {
        domain: PermissionDomain.UserManagement,
        permission: "deactivate",
      };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);

      const userWithDeactivate = buildUser(Role.Admin, {
        view: true,
        add: false,
        edit: false,
        reset_password: false,
        deactivate: true,
        reactivate: false,
        delete: false,
      });
      const context = createMockContext(userWithDeactivate);

      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
