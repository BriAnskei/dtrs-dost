/**
 * Unit tests for `hasModulePermission` — the typed authorization predicate
 * that bridges the `User` model (with its `permissions` map) and the
 * generic `hasPermission` flag reader.
 *
 *   hasModulePermission(user, moduleKey, permission)
 *
 * The function encodes two rules that are central to the authz model:
 *
 *   RULE 1 — Super-admin bypass:
 *     role_id === 1 always returns `true`, regardless of the user's
 *     permission flags.  This is checked FIRST (before touching the
 *     permissions object), so a super-admin with `permissions: null` is
 *     still fully authorized.
 *
 *   RULE 2 — Null-user short-circuit:
 *     If there is no user at all (e.g. the session hasn't resolved yet,
 *     or the session has expired), every permission check returns `false`.
 *     No user → no access.
 *
 * The `requirePermission` factory is also tested — it produces a predicate
 * `(user: User) => boolean` used by `PermissionRoute` and nav config.
 *
 * --- WIRING NOTE -----------------------------------------------------------
 * `UserProvider` populates `currentUser` via `/user/me` (see
 * current-user.service.ts).  The user object carries a `permissions`
 * map with one entry per module key (e.g.
 * `permissions.user_management_permissions`).  `hasModulePermission`
 * reads that map — so these tests pin the contract between the auth
 * layer (who the user is) and the authz layer (what they can do).
 */

import { describe, expect, it } from "vitest";
import type { User } from "../../../../context/currentUser/curr-user.type";
import { UserManagementPermissionEnum } from "../enum/user-management-permission";
import {
  hasModulePermission,
  requirePermission,
} from "./has-module-permission";

/**
 * Test fixture: a non-super-admin user with a selective set of
 * user-management permissions.  Everything not explicitly granted
 * is `false`, mirroring a real backend response for a partial-access admin.
 */
function makeUser(
  overrides: Partial<User> = {},
): User {
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

describe("hasModulePermission", () => {
  describe("super-admin bypass (role_id === 1)", () => {
    it("returns true for EVERY permission when role_id is 1", () => {
      /*
       * Super admin bypasses ALL permission checks.  Even if the user
       * object arrives with `permissions: null` (e.g. a freshly
       * bootstrapped super-admin account), they must still get access.
       */
      const superAdmin = makeUser({
        role_id: 1,
        permissions: { user_management_permissions: null },
      });

      expect(
        hasModulePermission(
          superAdmin,
          "user_management_permissions",
          UserManagementPermissionEnum.View,
        ),
      ).toBe(true);
      expect(
        hasModulePermission(
          superAdmin,
          "user_management_permissions",
          UserManagementPermissionEnum.Delete,
        ),
      ).toBe(true);
      expect(
        hasModulePermission(
          superAdmin,
          "user_management_permissions",
          UserManagementPermissionEnum.Reactivate,
        ),
      ).toBe(true);
    });
  });

  describe("null / undefined user", () => {
    it("returns false when user is null", () => {
      expect(
        hasModulePermission(null, "user_management_permissions", "view"),
      ).toBe(false);
    });

    it("returns false when user is undefined", () => {
      expect(
        hasModulePermission(undefined, "user_management_permissions", "view"),
      ).toBe(false);
    });
  });

  describe("non-super-admin user", () => {
    it("returns true when the permission flag is set", () => {
      const user = makeUser();
      expect(
        hasModulePermission(
          user,
          "user_management_permissions",
          UserManagementPermissionEnum.View,
        ),
      ).toBe(true);
    });

    it("returns false when the permission flag is not set", () => {
      const user = makeUser();
      expect(
        hasModulePermission(
          user,
          "user_management_permissions",
          UserManagementPermissionEnum.Add,
        ),
      ).toBe(false);
    });

    it("returns false when the module permissions object is null", () => {
      const user = makeUser({
        permissions: { user_management_permissions: null },
      });
      expect(
        hasModulePermission(
          user,
          "user_management_permissions",
          UserManagementPermissionEnum.View,
        ),
      ).toBe(false);
    });
  });
});

describe("requirePermission", () => {
  it("returns a predicate function", () => {
    const predicate = requirePermission(
      "user_management_permissions",
      UserManagementPermissionEnum.View,
    );
    expect(typeof predicate).toBe("function");
  });

  it("the predicate returns true for a user with the permission", () => {
    const hasView = requirePermission(
      "user_management_permissions",
      UserManagementPermissionEnum.View,
    );
    expect(hasView(makeUser())).toBe(true);
  });

  it("the predicate returns false for a user without the permission", () => {
    const hasDelete = requirePermission(
      "user_management_permissions",
      UserManagementPermissionEnum.Delete,
    );
    expect(hasDelete(makeUser())).toBe(false);
  });

  it("the predicate returns true for super admin", () => {
    const hasDelete = requirePermission(
      "user_management_permissions",
      UserManagementPermissionEnum.Delete,
    );
    const superAdmin = makeUser({
      role_id: 1,
      permissions: { user_management_permissions: null },
    });
    expect(hasDelete(superAdmin)).toBe(true);
  });
});
