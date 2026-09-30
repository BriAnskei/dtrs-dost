import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import { RolesGuard } from "./roles.guard";
import { ROLES_KEY } from "../decorator/roles.decorator";
import { Role } from "../enum/roles.enum";

/**
 * Helper: creates a mock ExecutionContext whose HTTP request carries
 * (or omits) the given authenticated user.
 *
 * RolesGuard calls:
 *   1. context.getHandler() / context.getClass() — passed to Reflector
 *   2. context.switchToHttp().getRequest() — to read request.user
 *
 * When `user` is null we simulate an unauthenticated request
 * (no user property on the request object).
 */
function createMockContext(user: { id: string; email: string; role_id: number } | null): ExecutionContext {
  const request = user === null ? {} : { user };

  return {
    getHandler: jest.fn().mockReturnValue(jest.fn()),
    getClass: jest.fn().mockReturnValue(jest.fn()),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  describe("when no role decorator is present on the route", () => {
    /**
     * When no @Roles() decorator is applied, the reflector returns
     * undefined. The guard short-circuits and returns true — the
     * endpoint has no role-based restriction.
     *
     * It also verifies that getAllAndOverride is called with the
     * correct ROLES_KEY and the handler/class array from the context.
     */
    it("should return true when no roles metadata is set", () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const user = { id: "user-1", email: "user@example.com", role_id: Role.ReceiverOfficer };
      const context = createMockContext(user);

      expect(guard.canActivate(context)).toBe(true);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        ROLES_KEY,
        [expect.any(Function), expect.any(Function)],
      );
    });
  });

  describe("when the user has the required role", () => {
    /**
     * Happy path: the route requires a specific role (e.g. Admin)
     * and the authenticated user's role_id is in the allowed set.
     * The guard returns true.
     */
    it("should return true when user has one of the required roles", () => {
      reflector.getAllAndOverride.mockReturnValue([Role.Admin]);

      const adminUser = { id: "admin-1", email: "admin@example.com", role_id: Role.Admin };
      const context = createMockContext(adminUser);

      expect(guard.canActivate(context)).toBe(true);
    });

    /**
     * When multiple roles are accepted (e.g. Admin OR SuperAdmin),
     * the user passes if their role matches any one in the array.
     */
    it("should return true when multiple roles are required and user has one of them", () => {
      reflector.getAllAndOverride.mockReturnValue([Role.Admin, Role.SuperAdmin]);

      const adminUser = { id: "admin-1", email: "admin@example.com", role_id: Role.Admin };
      const context = createMockContext(adminUser);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe("when the user does not have the required role", () => {
    /**
     * The route requires Admin role, but the user is a ReceiverOfficer.
     * The guard throws ForbiddenException with "not allowed to perform this action".
     */
    it("should throw ForbiddenException when user role is not in required roles", () => {
      reflector.getAllAndOverride.mockReturnValue([Role.Admin]);

      const regularUser = {
        id: "user-1",
        email: "user@example.com",
        role_id: Role.ReceiverOfficer,
      };
      const context = createMockContext(regularUser);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        "You are not allowed to perform this action",
      );
    });
  });

  describe("when the user is not authenticated", () => {
    /**
     * When no user is present on the request (e.g. a missing or
     * invalid JWT), the guard throws ForbiddenException with
     * "User not authenticated" before checking roles.
     */
    it("should throw ForbiddenException when user is not present on the request", () => {
      reflector.getAllAndOverride.mockReturnValue([Role.Admin]);

      const context = createMockContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow("User not authenticated");
    });
  });
});
