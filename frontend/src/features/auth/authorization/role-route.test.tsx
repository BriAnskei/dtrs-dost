/**
 * Unit tests for `RoleRoute` — the route guard that gates access by
 * user role (RBAC-style), distinct from the claims-based PermissionRoute.
 *
 *   ── no user ──────────────────────────→ <Navigate to="/signin" />
 *   ── super admin (role 1) NOT in roles ──→ <Navigate to="/notfound" />
 *   ── super admin (role 1) in roles ─�────→ render children
 *   ── role in allowedRoles ───────────────→ render children
 *   ── role NOT in allowedRoles ──────────→ <Navigate to="/unauthorized" />
 *
 * The super-admin /notfound redirect is intentional: a super admin who
 * stumbles into a role-restricted page they shouldn't see (because the
 * allowedRoles list doesn't include 1) gets sent to /notfound rather than
 * /unauthorized — it's a configuration guard, not a permissions denial.
 *
 * We mock `useUser` and assert via the catch-all <LocationDisplay>
 * provided by renderRoutes.
 */

import { screen } from "@testing-library/react";
import { Route } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { LocationDisplay, renderRoutes } from "../../../tests/test-utils";
import RoleRoute from "./RoleRoutes";
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

describe("RoleRoute", () => {
  it("redirects to /signin when there is no authenticated user", () => {
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

    renderRoutes(
      <Route
        path="/admin"
        element={
          <RoleRoute allowedRoles={[2]}>
            <ProtectedContent />
          </RoleRoute>
        }
      />,
      ["/admin"],
    );

    expect(screen.getByTestId("location").textContent).toBe("/signin");
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("renders children when the user's role is in allowedRoles", () => {
    mockUseUser.mockReturnValue({
      currentUser: makeUser({ role_id: 2 }),
      isLoading: false,
    });

    renderRoutes(
      <Route
        path="/admin"
        element={
          <RoleRoute allowedRoles={[2, 3]}>
            <ProtectedContent />
          </RoleRoute>
        }
      />,
      ["/admin"],
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("renders children for super admin when role 1 IS in allowedRoles", () => {
    mockUseUser.mockReturnValue({
      currentUser: makeUser({ role_id: 1 }),
      isLoading: false,
    });

    renderRoutes(
      <Route
        path="/admin"
        element={
          <RoleRoute allowedRoles={[1, 2]}>
            <ProtectedContent />
          </RoleRoute>
        }
      />,
      ["/admin"],
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("redirects super admin to /notfound when role 1 is NOT in allowedRoles", () => {
    /*
     * Super admin (role 1) hits a page that explicitly excludes role 1.
     * This is a misconfiguration guard → /notfound, not /unauthorized.
     */
    mockUseUser.mockReturnValue({
      currentUser: makeUser({ role_id: 1 }),
      isLoading: false,
    });

    renderRoutes(
      <Route
        path="/admin"
        element={
          <RoleRoute allowedRoles={[2]}>
            <ProtectedContent />
          </RoleRoute>
        }
      />,
      ["/admin"],
    );

    expect(screen.getByTestId("location").textContent).toBe("/notfound");
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("redirects a non-authorized user to /unauthorized", () => {
    mockUseUser.mockReturnValue({
      currentUser: makeUser({ role_id: 3 }),
      isLoading: false,
    });

    renderRoutes(
      <Route
        path="/admin"
        element={
          <RoleRoute allowedRoles={[2]}>
            <ProtectedContent />
          </RoleRoute>
        }
      />,
      ["/admin"],
    );

    expect(screen.getByTestId("location").textContent).toBe("/unauthorized");
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });
});
