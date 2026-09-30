/**
 * Unit tests for `PermissionRoute` — the route guard that wires
 * AUTHENTICATION (is there a current user?) with AUTHORIZATION (does
 * that user have the required claim?).
 *
 *   ── no user ──────────────────────────→ <Navigate to="/signin" />
 *   ── user, super admin (role 1) ─────────→ render children  (bypass)
 *   ── user, hasPermission(user) === true ─→ render children
 *   ── user, hasPermission(user) === false─→ <Navigate to="/unauthorized" />
 *
 * `PermissionRoute` receives an opaque `hasPermission: (user: User) => boolean`
 * predicate (typically built by `requirePermission(moduleKey, permission)`).
 * This test injects predicates directly so we can verify the guard logic
 * without coupling to a specific permission module.
 *
 * We mock `useUser` (the single read point of the user context) and assert on
 * rendered output inside a <MemoryRouter> + <Routes>.  The catch-all `*`
 * route from renderRoutes renders LocationDisplay, proving redirect targets.
 */

import { screen } from "@testing-library/react";
import { Route } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { LocationDisplay, renderRoutes } from "../../../tests/test-utils";
import PermissionRoute from "./PermissionRoute";
import type { User } from "../../../context/currentUser/curr-user.type";

const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));

vi.mock("../../../context/currentUser/use-user", () => ({
  useUser: mockUseUser,
}));

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
    permissions: { user_management_permissions: null },
    ...overrides,
  };
}

const ProtectedContent = () => <span data-testid="content">Protected page</span>;

describe("PermissionRoute", () => {
  it("redirects to /signin when there is no authenticated user", () => {
    /*
     * Authentication gate: if the session hasn't resolved (no user yet),
     * PermissionRoute must bounce to /signin — same as ProtectedRoute.
     * Authorization hasn't even been evaluated.
     */
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

    renderRoutes(
      <Route
        path="/users"
        element={
          <PermissionRoute hasPermission={() => true}>
            <ProtectedContent />
          </PermissionRoute>
        }
      />,
      ["/users"],
    );

    expect(screen.getByTestId("location").textContent).toBe("/signin");
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("renders children for super admin (role_id 1) regardless of the permission predicate", () => {
    /*
     * Authorization bypass: super admin always gets through, even if the
     * predicate returns false.  This is the "god mode" escape hatch.
     */
    mockUseUser.mockReturnValue({
      currentUser: makeUser({ role_id: 1, permissions: { user_management_permissions: null } }),
      isLoading: false,
    });

    renderRoutes(
      <Route
        path="/users"
        element={
          <PermissionRoute hasPermission={() => false}>
            <ProtectedContent />
          </PermissionRoute>
        }
      />,
      ["/users"],
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("renders children when the permission predicate returns true", () => {
    mockUseUser.mockReturnValue({
      currentUser: makeUser({ role_id: 2 }),
      isLoading: false,
    });

    renderRoutes(
      <Route
        path="/users"
        element={
          <PermissionRoute hasPermission={() => true}>
            <ProtectedContent />
          </PermissionRoute>
        }
      />,
      ["/users"],
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("redirects to /unauthorized when the user lacks the required permission", () => {
    /*
     * Authz failure: the user IS authenticated (not bounced to /signin)
     * but does NOT have the claim.  The redirect target is /unauthorized,
     * not /signin — that distinction is the whole point of separate
     * authentication vs. authorization handling.
     */
    mockUseUser.mockReturnValue({
      currentUser: makeUser({ role_id: 2 }),
      isLoading: false,
    });

    renderRoutes(
      <Route
        path="/users"
        element={
          <PermissionRoute hasPermission={() => false}>
            <ProtectedContent />
          </PermissionRoute>
        }
      />,
      ["/users"],
    );

    // Navigate lands on /unauthorized → catch-all <LocationDisplay>.
    expect(screen.getByTestId("location").textContent).toBe("/unauthorized");
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });
});
