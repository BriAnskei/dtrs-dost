/**
 * PublicRoute guard tests.
 *
 * PublicRoute (`routes/PublicRoute.tsx`) wraps the /signin page.  Its contract
 * (the inverse of ProtectedRoute):
 *
 *   - isLoading  → <AppShellSkeleton />
 *   - user set   → <Navigate to="/" replace />   (don't let a logged-in user
 *                     stare at the sign-in form).
 *   - no user    → render children               (the <SignIn /> form).
 *
 * Mirrors protected-route.test.tsx: same useUser mock pattern, same skeleton
 * stub.
 */

import { screen } from "@testing-library/react";
import { Route } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { LocationDisplay, renderRoutes } from "../tests/test-utils";
import PublicRoute from "./PublicRoute";

const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));

vi.mock("../context/currentUser/user-user", () => ({ useUser: mockUseUser }));

vi.mock("../components/Appshellskeleton", () => ({
  default: () => <span data-testid="skeleton">Loading…</span>,
}));

const FORM_MARKER = "Sign-in form";

describe("PublicRoute", () => {
  it("renders the skeleton while the session is loading", () => {
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: true });

    renderRoutes(
      <Route
        path="/signin"
        element={
          <PublicRoute>
            <span>{FORM_MARKER}</span>
          </PublicRoute>
        }
      />,
      ["/signin"],
    );

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByText(FORM_MARKER)).not.toBeInTheDocument();
  });

  it("redirects a logged-in user away from /signin to /", () => {
    /*
     * Logged-in user visiting /signin → PublicRoute emits <Navigate to="/" />.
     * Only the guarded route is declared; "/" then falls through to the
     * catch-all <LocationDisplay>, proving the redirect target.
     */
    mockUseUser.mockReturnValue({
      currentUser: {
        id: "u1",
        full_name: "Jane Doe",
        email: "jane@example.com",
        role_id: 1,
        division_id: null,
        contect_number: null,
        is_active: true,
      },
      isLoading: false,
    });

    renderRoutes(
      <Route
        path="/signin"
        element={
          <PublicRoute>
            <span>{FORM_MARKER}</span>
          </PublicRoute>
        }
      />,
      ["/signin"],
    );

    expect(screen.getByTestId("location").textContent).toBe("/");
    expect(screen.queryByText(FORM_MARKER)).not.toBeInTheDocument();
  });

  it("renders the sign-in form when there is no authenticated user", () => {
    /*
     * No user + not loading → children (the form) render; the embedded
     * <LocationDisplay> proves the pathname stayed /signin (no redirect).
     */
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

    renderRoutes(
      <Route
        path="/signin"
        element={
          <PublicRoute>
            <span>{FORM_MARKER}</span>
            <LocationDisplay />
          </PublicRoute>
        }
      />,
      ["/signin"],
    );

    expect(screen.getByText(FORM_MARKER)).toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).toBe("/signin");
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });
});
