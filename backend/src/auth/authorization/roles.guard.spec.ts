import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { Role } from "./roles.enum";
import { ROLES_KEY } from "./roles.decorator";

/**
 * Creates a mock ExecutionContext with a configurable `req.user`.
 * The `request` object is returned so tests can assert on it if needed.
 */
function createMockContext(
  user: unknown,
): { context: ExecutionContext; handler: jest.Mock; cls: jest.Mock } {
  const handler = jest.fn();
  const cls = jest.fn();
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;

  return { context, handler, cls };
}

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  /**
   * Verifies that when no @Roles() decorator is found on the handler or class,
   * the guard returns true — allowing any authenticated user through.
   * Authentication itself is enforced separately by JwtAuthGuard.
   */
  it("should allow access when no @Roles() decorator is present", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const { context } = createMockContext({
      id: "user-1",
      email: "test@example.com",
      role_id: Role.Admin,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  /**
   * Verifies that when the user has the required role, access is granted.
   */
  it("should allow access when user has required role", () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SuperAdmin]);

    const { context } = createMockContext({
      id: "user-1",
      email: "test@example.com",
      role_id: Role.SuperAdmin,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  /**
   * Verifies that when multiple roles are required and the user has
   * at least one of them, access is granted.
   */
  it("should allow access when user has one of multiple required roles", () => {
    reflector.getAllAndOverride.mockReturnValue([
      Role.Admin,
      Role.SuperAdmin,
    ]);

    const { context } = createMockContext({
      id: "user-1",
      email: "test@example.com",
      role_id: Role.SuperAdmin,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  /**
   * Verifies that when the user's role is not in the required roles list,
   * a ForbiddenException is thrown with "You are not allowed to perform this action".
   */
  it("should throw ForbiddenException when user lacks required role", () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SuperAdmin]);

    const { context } = createMockContext({
      id: "user-1",
      email: "test@example.com",
      role_id: Role.Admin,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      "You are not allowed to perform this action",
    );
  });

  /**
   * Verifies that when no user is attached to the request (e.g.
   * JwtAuthGuard did not run or did not set req.user), the guard
   * throws ForbiddenException with "User not authenticated".
   */
  it("should throw ForbiddenException when user is not on request", () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SuperAdmin]);

    const { context } = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow("User not authenticated");
  });

  /**
   * Verifies that when the user object exists but role_id is undefined
   * (malformed payload), the guard throws ForbiddenException since
   * `[Role.SuperAdmin].includes(undefined)` returns false.
   */
  it("should throw ForbiddenException when user.role_id is undefined", () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SuperAdmin]);

    const { context } = createMockContext({
      id: "user-1",
      email: "test@example.com",
      role_id: undefined,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      "You are not allowed to perform this action",
    );
  });

  /**
   * Verifies that the guard reads @Roles() metadata from both the
   * handler and the class using the correct ROLES_KEY.
   */
  it("should read @Roles() metadata from handler and class", () => {
    const { context, handler, cls } = createMockContext({
      id: "user-1",
      email: "test@example.com",
      role_id: Role.Admin,
    });

    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);

    guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      cls,
    ]);
  });
});
