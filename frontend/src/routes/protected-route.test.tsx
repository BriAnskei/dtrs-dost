/**
 * ProtectedRoute guard tests.
 *
 * ProtectedRoute (`routes/protectedRoute.tsx`) wraps every authenticated
 * layout route.  Its contract:
 *
 *   - isLoading  → <AppShellSkeleton />  (no redirect; keep the shell stable
 *     while we resolve the session).
 *   - !user      → <Navigate to="/signin" replace />  (bounce unauth visitors).
 *   -  user      → render children.
 *
 * We mock `useUser` (the single read point of the user context) and assert on
 * rendered output inside a <MemoryRouter> + <Routes>.  The AppShellSkeleton is
 * stubbed so the focus stays on routing logic.
 *
 * The catch-all `*` route in renderRoutes renders <LocationDisplay>, which
 * reports the final pathname — that's how we assert <Navigate> destinations.
 */

import { screen } from "@testing-library/react";
import { Route } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { LocationDisplay, renderRoutes } from "../tests/test-utils";
import ProtectedRoute from "./protectedRoute";

const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));

vi.mock("../context/currentUser/user-user", () => ({ useUser: mockUseUser }));

vi.mock("../components/Appshellskeleton", () => ({
  default: () => <span data-testid="skeleton">Loading…</span>,
}));

const PROTECTED_MARKER = "Protected content";

describe("ProtectedRoute", () => {
  it("renders the skeleton while the session is loading", () => {
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: true });

    renderRoutes(
      <Route
        path="/protected"
        element={
          <ProtectedRoute>
            <span>{PROTECTED_MARKER}</span>
          </ProtectedRoute>
        }
      />,
      ["/protected"],
    );

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByText(PROTECTED_MARKER)).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor to /signin", () => {
    /*
     * No user + not loading → ProtectedRoute emits <Navigate to="/signin" />.
     * Only the guarded route is declared; the destination "/signin" then falls
     * through to the catch-all <LocationDisplay>, proving the redirect target.
     */
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

    renderRoutes(
      <Route
        path="/protected"
        element={
          <ProtectedRoute>
            <span>{PROTECTED_MARKER}</span>
          </ProtectedRoute>
        }
      />,
      ["/protected"],
    );

    expect(screen.getByTestId("location").textContent).toBe("/signin");
    expect(screen.queryByText(PROTECTED_MARKER)).not.toBeInTheDocument();
  });

  it("renders children when an authenticated user exists (no redirect)", () => {
    /*
     * A user is present → children render and the URL stays at /protected
     * (LocationDisplay inside the children proves no redirect happened).
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
        path="/protected"
        element={
          <ProtectedRoute>
            <span>{PROTECTED_MARKER}</span>
            <LocationDisplay />
          </ProtectedRoute>
        }
      />,
      ["/protected"],
    );

    expect(screen.getByText(PROTECTED_MARKER)).toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).toBe("/protected");
  });

  it("renders the server-unavailable recovery screen instead of redirecting on serverError", () => {
    /*
     * Network failure resolving the session: ProtectedRoute must NOT bounce to
     * /signin (that path is for genuine auth expiry). It stays put and shows the
     * recoverable "server unreachable" screen with a Retry, hiding the children.
     */
    const mockRefetch = vi.fn();
    mockUseUser.mockReturnValue({
      currentUser: null,
      isLoading: false,
      serverError: true,
      refetch: mockRefetch,
    });

    renderRoutes(
      <Route
        path="/protected"
        element={
          <ProtectedRoute>
            <span>{PROTECTED_MARKER}</span>
          </ProtectedRoute>
        }
      />,
      ["/protected"],
    );

    // No <Navigate> happened: the guarded children stayed hidden and the
    // recoverable server-unreachable screen rendered in their place.
    expect(screen.queryByText(PROTECTED_MARKER)).not.toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.getByText(/Could not reach the server/)).toBeInTheDocument();
  });
});
