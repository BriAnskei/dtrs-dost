/**
 * PublicRoute guard tests.
 *
 * PublicRoute (`routes/PublicRoute.tsx`) wraps the /signin page.  Its
 * contract (the inverse of ProtectedRoute):
 *
 *   - isLoading  → <AppShellSkeleton />
 *   - user set   → <Navigate to="/" replace />   (don't let a logged-in user
 *                     stare at the sign-in form).
 *   - no user    → render children               (the <SignIn /> form).
 *
 * Mirrors protected-route.test.tsx: same useUser mock pattern, same skeleton
 * stub.
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route } from "react-router";
import PublicRoute from "./PublicRoute";
import { renderRoutes } from "../tests/test-utils";

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
      <PublicRoute>
        <span>{FORM_MARKER}</span>
      </PublicRoute>,
      ["/signin"],
    );

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByText(FORM_MARKER)).not.toBeInTheDocument();
  });

  it("redirects a logged-in user away from /signin to the dashboard", () => {
    /*
     * A logged-in user visiting /signin should be bounced to "/" — there's
     * nothing for them to sign in to.  The resulting pathname (captured by
     * the catch-all LocationDisplay) proves the Navigate target.
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
      [
        <Route key="home" path="/" element={<span id="home">Home (dashboard redirect)</span>} />,
        <Route
          key="signin"
          path="/signin"
          element={
            <PublicRoute>
              <span>{FORM_MARKER}</span>
            </PublicRoute>
          }
        />,
      ],
      ["/signin"],
    );

    // Bounce to "/" → home route matched.
    expect(screen.getByText("Home (dashboard redirect)")).toBeInTheDocument();
    expect(screen.queryByText(FORM_MARKER)).not.toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("renders the sign-in form when there is no authenticated user", () => {
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

    renderRoutes(
      <PublicRoute>
        <span>{FORM_MARKER}</span>
      </PublicRoute>,
      ["/signin"],
    );

    expect(screen.getByText(FORM_MARKER)).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });
});
