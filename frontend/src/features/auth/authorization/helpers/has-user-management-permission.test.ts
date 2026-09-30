/**
 * Unit tests for `hasUserManagementPermission` — the convenience wrapper
 * around `hasModulePermission` that hard-codes the module key to
 * `"user_management_permissions"` and accepts the `UserManagementPermissionEnum`
 * values directly.
 *
 * This is the function used by route-level guards and inline `Can` blocks
 * throughout the user-management feature.  It encodes the same two rules
 * tested in `has-module-permission.test.ts` (super-admin bypass + null-user
 * short-circuit) but with the enum type narrowing that makes call-sites
 * safer.
 */

import { describe, expect, it } from "vitest";
import type { User } from "../../../../context/currentUser/curr-user.type";
import { UserManagementPermissionEnum } from "../enum/user-management-permission";
import { hasUserManagementPermission } from "./has-user-management-permission";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    full_name: "Jane Doe",
    email: "jane@example.com",
    role_id: 2,
    division_id: null,
    contact_number: null,
    position: null,
    is_active: true,
    permissions: {
      user_management_permissions: {
        view: true,
        add: false,
        edit: false,
        reset_password: false,
        deactivate: false,
        reactivate: false,
        delete: false,
      },
    },
    ...overrides,
  };
}

describe("hasUserManagementPermission", () => {
  it("returns true for a granted flag", () => {
    const user = makeUser();
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.View)).toBe(true);
  });

  it("returns false for a denied flag", () => {
    const user = makeUser();
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.Add)).toBe(false);
  });

  it("returns false when user_management_permissions is null", () => {
    const user = makeUser({
      permissions: { user_management_permissions: null },
    });
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.View)).toBe(false);
  });

  it("super admin (role_id === 1) bypasses ALL checks", () => {
    const user = makeUser({
      role_id: 1,
      permissions: { user_management_permissions: null },
    });

    // Every enum value returns true for super admin.
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.View)).toBe(true);
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.Add)).toBe(true);
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.Edit)).toBe(true);
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.ResetPassword)).toBe(true);
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.Deactivate)).toBe(true);
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.Reactivate)).toBe(true);
    expect(hasUserManagementPermission(user, UserManagementPermissionEnum.Delete)).toBe(true);
  });
});
