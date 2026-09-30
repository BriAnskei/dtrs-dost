/**
 * Unit tests for the `usePermissions` hook — the authz entrypoint that
 * React components (Can, nav items, table action buttons) consume.
 *
 * WIRING: usePermissions reads `currentUser` from the `UserContext`
 * (populated by UserProvider via the `/user/me` session fetch).  The user
 * object carries a claims-style `permissions` map.  This test mocks
 * `useUser` (the context reader) so we can feed different users through the
 * REAL `hasModulePermission` logic and assert the resulting `can` /
 * `canAny` / `canAll` predicates.
 *
 * ─── Auth ↔ Authz chain ───────────────────────────────────────────────────
 *   authentication.session.flag (localStorage "auth:authenticated")
 *     → apiClient 401 interceptor → refresh()
 *     → /user/me resolves → UserProvider stores User (with claims)
 *     → useUser() reads User → usePermissions() exposes can/canAny/canAll
 *     → Can / PermissionRoute gate UI and routes
 *
 * If any link breaks, the authorization UI becomes inaccessible even for
 * users who should have access.  These tests pin the claims → predicate
 * link directly.
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));

vi.mock("../../../../context/currentUser/use-user", () => ({
  useUser: mockUseUser,
}));

import type { User } from "../../../../context/currentUser/curr-user.type";
import { usePermissions } from "./use-permissions";
import { UserManagementPermissionEnum } from "../enum/user-management-permission";

const FULL_PERMISSIONS = {
  view: true,
  add: true,
  edit: true,
  reset_password: true,
  deactivate: true,
  reactivate: true,
  delete: true,
};

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
    permissions: { user_management_permissions: FULL_PERMISSIONS },
    ...overrides,
  };
}

describe("usePermissions", () => {
  it("returns can, canAny, and canAll functions", () => {
    mockUseUser.mockReturnValue({ currentUser: makeUser(), isLoading: false });

    const { result } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    expect(typeof result.current.can).toBe("function");
    expect(typeof result.current.canAny).toBe("function");
    expect(typeof result.current.canAll).toBe("function");
  });

  it("can returns true for a granted permission", () => {
    mockUseUser.mockReturnValue({ currentUser: makeUser(), isLoading: false });

    const { result } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    expect(result.current.can(UserManagementPermissionEnum.View)).toBe(true);
    expect(result.current.can(UserManagementPermissionEnum.Add)).toBe(true);
  });

  it("can returns false for a denied permission", () => {
    const user = makeUser({
      permissions: {
        user_management_permissions: {
          view: false,
          add: false,
          edit: false,
          reset_password: false,
          deactivate: false,
          reactivate: false,
          delete: false,
        },
      },
    });
    mockUseUser.mockReturnValue({ currentUser: user, isLoading: false });

    const { result } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    expect(result.current.can(UserManagementPermissionEnum.View)).toBe(false);
    expect(result.current.can(UserManagementPermissionEnum.Add)).toBe(false);
  });

  it("can returns false for EVERY permission when user is null (session expired)", () => {
    /*
     * Auth ↔ authz link: when the session expires, UserProvider sets
     * currentUser to null.  useUser returns null, so every permission
     * check must fail — no claims, no access.
     */
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

    const { result } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    expect(result.current.can(UserManagementPermissionEnum.View)).toBe(false);
    expect(result.current.can(UserManagementPermissionEnum.Delete)).toBe(false);
  });

  it("canAny returns true when at least one permission is granted", () => {
    const user = makeUser({
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
    });
    mockUseUser.mockReturnValue({ currentUser: user, isLoading: false });

    const { result } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    expect(
      result.current.canAny(UserManagementPermissionEnum.View, UserManagementPermissionEnum.Delete),
    ).toBe(true);
  });

  it("canAny returns false when NO permission is granted", () => {
    const user = makeUser({
      permissions: {
        user_management_permissions: {
          view: false,
          add: false,
          edit: false,
          reset_password: false,
          deactivate: false,
          reactivate: false,
          delete: false,
        },
      },
    });
    mockUseUser.mockReturnValue({ currentUser: user, isLoading: false });

    const { result } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    expect(
      result.current.canAny(UserManagementPermissionEnum.View, UserManagementPermissionEnum.Add),
    ).toBe(false);
  });

  it("canAll returns true only when ALL permissions are granted", () => {
    mockUseUser.mockReturnValue({ currentUser: makeUser(), isLoading: false });

    const { result } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    expect(
      result.current.canAll(UserManagementPermissionEnum.View, UserManagementPermissionEnum.Add),
    ).toBe(true);
  });

  it("canAll returns false when ANY permission is missing", () => {
    const user = makeUser({
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
    });
    mockUseUser.mockReturnValue({ currentUser: user, isLoading: false });

    const { result } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    expect(
      result.current.canAll(UserManagementPermissionEnum.View, UserManagementPermissionEnum.Add),
    ).toBe(false);
  });

  it("super admin bypasses ALL permission checks (can returns true for everything)", () => {
    /*
     * role_id === 1 short-circuits hasModulePermission → true,
     * regardless of the actual permission flags on the user object.
     */
    const superAdmin = makeUser({
      role_id: 1,
      permissions: {
        user_management_permissions: {
          view: false,
          add: false,
          edit: false,
          reset_password: false,
          deactivate: false,
          reactivate: false,
          delete: false,
        },
      },
    });
    mockUseUser.mockReturnValue({ currentUser: superAdmin, isLoading: false });

    const { result } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    expect(result.current.can(UserManagementPermissionEnum.View)).toBe(true);
    expect(result.current.can(UserManagementPermissionEnum.Delete)).toBe(true);
    expect(result.current.canAll(...Object.values(UserManagementPermissionEnum))).toBe(true);
  });

  it("re-evaluates when the user object identity changes", () => {
    /*
     * usePermissions uses useMemo keyed on [currentUser, moduleKey].
     * When the session resolves (null → user) the memoized predicates
     * must recompute, not serve a stale "all false" result.
     */
    const { result, rerender } = renderHook(() =>
      usePermissions("user_management_permissions"),
    );

    // Start with no user.
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });
    rerender();
    expect(result.current.can(UserManagementPermissionEnum.View)).toBe(false);

    // Session resolves — user now has permissions.
    mockUseUser.mockReturnValue({ currentUser: makeUser(), isLoading: false });
    rerender();
    expect(result.current.can(UserManagementPermissionEnum.View)).toBe(true);
  });
});
