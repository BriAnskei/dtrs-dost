/**
 * ProtectedRoute guard tests.
 *
 * ProtectedRoute (`routes/protectedRoute.tsx`) wraps every authenticated
 * layout route.  Its contract:
 *
 *   - isLoading  → show <AppShellSkeleton />  (no redirect, keep the shell
 *     stable while we resolve the session).
 *   - !user      → <Navigate to="/signin" replace />  (kick unauth visitors
 *     back to sign-in).
 *   -  user      → render children.
 *
 * These tests mock `useUser` (the single read point of the user context) and
 * assert on the rendered outcome inside a <MemoryRouter>.
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route } from "react-router";
import ProtectedRoute from "./protectedRoute";
import { renderRoutes } from "../tests/test-utils";

/*
 * Hoisted mock so the file-scope `vi.mock` factory can reference it.
 * Each test sets the return value via `mockUseUser`.
 */
const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));

vi.mock("../context/currentUser/user-user", () => ({ useUser: mockUseUser }));

/*
 * Stub the real skeleton so tests don't depend on react-loading-skeleton's
 * internals — we only care about the guard's branching, not the loading UI.
 */
vi.mock("../components/Appshellskeleton", () => ({
  default: () => <span data-testid="skeleton">Loading…</span>,
}));

const PROTECTED_MARKER = "Protected content";

describe("ProtectedRoute", () => {
  it("renders the skeleton while the session is loading", () => {
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: true });

    renderRoutes(
      <ProtectedRoute>
        <span>{PROTECTED_MARKER}</span>
      </ProtectedRoute>,
      ["/protected"]},
    );

    // Skeleton visible, protected content NOT yet rendered.
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByText(PROTECTED_MARKER)).not.toBeInTheDocument();
  });

  it("redirects to /signin when there is no authenticated user", () => {
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

    renderRoutes(
      [
        <Route
          key="signin"
          path="/signin"
          element={<span id="signin-page">Sign in page</span>}
        />,
        <Route
          key="protected"
          path="/protected"
          element={
            <ProtectedRoute>
              <span>{PROTECTED_MARKER}</span>
            </ProtectedRoute>
          }
        />,
      ],
      ["/protected"],
    );

    // Navigate fired → /signin route matched → its content renders.
    expect(screen.getByText("Sign in page")).toBeInTheDocument();
    expect(screen.queryByText(PROTECTED_MARKER)).not.toBeInTheDocument();

    // Also confirm the resulting URL (proves the redirect target/pathname).
    expect(screen.getByTestId("location").textContent).toBe("/signin");
  });

  it("renders children when an authenticated user exists", () => {
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
      <ProtectedRoute>
        <span>{PROTECTED_MARKER}</span>
      </ProtectedRoute>,
      ["/protected"],
    );

    expect(screen.getByText(PROTECTED_MARKER)).toBeInTheDocument();
    // No redirect occurred.
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });
});
