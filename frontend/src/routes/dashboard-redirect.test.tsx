/**
 * DashboardRedirect tests (`routes/Redirect.tsx`).
 *
 * DashboardRedirect is the element rendered at the bare "/" route inside the
 * ProtectedRoute/ AppLayout shell.  It has two jobs:
 *
 *   1. If `currentUser` is null  → <Navigate to="/signin" />.
 *      This is the *final* leg of the session-expiry flow: once the
 *      UserProvider clears `currentUser` (driven by the `auth:session-expired`
 *      event the interceptor dispatched), ProtectedRoute stops redirecting
 *      to the skeleton and instead the now-null '/' route forwards to
 *      /signin.  (The toast itself is tested in api-client.test.ts.)
 *
 *   2. If `currentUser` exists  → <Navigate> to a role-specific dashboard:
 *        role 1 (super_admin)  → /super-admin/dashboard
 *        role 2 (admin)        → /admin/dashboard
 *        role 3 (receiver)     → /receiving-officer/dashboard
 *        role 4 (division)     → /division/assigned-documents
 *
 * We assert the destination pathname via the catch-all <LocationDisplay>
 * because <Navigate> does not render page content.
 */

import { screen } from "@testing-library/react";
import { Route } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { renderRoutes } from "../tests/test-utils";
import { DashboardRedirect } from "./Redirect";

const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));

vi.mock("../context/currentUser/use-user", () => ({ useUser: mockUseUser }));

function userWith(role_id: 1 | 2 | 3 | 4) {
  return {
    id: "u1",
    full_name: "Tester",
    email: "t@example.com",
    role_id,
    division_id: null,
    contect_number: null,
    is_active: true,
  };
}

describe("DashboardRedirect", () => {
  it("sends an unauthenticated visitor to /signin (post-expiry leg)", () => {
    /*
     * currentUser === null models the state reached AFTER the session-expiry
     * toast + notifySessionExpired cleared the user.  ProtectedRoute lets the
     * '/' route render, and DashboardRedirect forwards to /signin.
     */
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

    renderRoutes(<Route path="/" element={<DashboardRedirect />} />, ["/"]);

    expect(screen.getByTestId("location").textContent).toBe("/signin");
  });

  it.each([
    [1, "/super-admin/dashboard"],
    [2, "/admin/dashboard"],
    [3, "/receiving-officer/dashboard"],
    [4, "/division/assigned-documents"],
  ])("routes role %i to %s", (role, destination) => {
    mockUseUser.mockReturnValue({ currentUser: userWith(role), isLoading: false });

    renderRoutes(<Route path="/" element={<DashboardRedirect />} />, ["/"]);

    expect(screen.getByTestId("location").textContent).toBe(destination);
  });
});
