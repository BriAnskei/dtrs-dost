/**
 * UserProvider integration test — the missing link between the toast and the
 * redirect.
 *
 * Full session-expiry chain (end to end, within the component tree):
 *
 *   interceptor (401 + refresh fails)
 *     → showSessionExpiredToast()        [tested in api-client.test.ts]
 *     → notifySessionExpired()          [dispatches window "auth:session-expired"]
 *     → UserProvider listener           [THIS FILE: sets currentUser = null]
 *     → ProtectedRoute sees !user       [tested in protected-route.test.tsx]
 *     → <Navigate to="/signin" />
 *
 * This test proves the middle step: when the `auth:session-expired` event
 * fires, `currentUser` becomes null and a downstream ProtectedRoute redirects
 * to /signin.  Without the localStorage-backed flag (the fix) the event is
 * never dispatched in the first place — so this test, combined with
 * api-client.test.ts, locks the whole feature.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, act } from "@testing-library/react";
import { Route } from "react-router";
import { UserProvider } from "./user-provider";
import { useUser } from "./user-user";
import ProtectedRoute from "../routes/protectedRoute";
import { AUTH_SESSION_EXPIRED, notifySessionExpired } from "../features/authentication/authentication.events";
import { renderRoutes } from "../tests/test-utils";

/*
 * currentUserService.getCurrentUser() is async; mock it to resolve a user on
 * mount so the provider reaches the "authenticated, not loading" state.
 */
const { mockGetCurrentUser } = vi.hoisted(() => ({ mockGetCurrentUser: vi.fn() }));
vi.mock("./current-user.service", () => ({
  currentUserService: { getCurrentUser: mockGetCurrentUser },
}));

/*
 * A tiny consumer that reads the same context ProtectedRoute uses, so we can
 * assert the user value without reaching into context internals.
 */
function UserProbe() {
  const { currentUser } = useUser();
  return <span data-testid="probe">{currentUser ? currentUser.email : "none"}</span>;
}

describe("UserProvider — session-expiry event integration", () => {
  afterEach(() => {
    // Restore a clean slate for the persisted flag between tests.
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("clears currentUser (and downstream ProtectedRoute redirects) when the session-expired event fires", async () => {
    // Pretend the user logged in before — persists across reload.
    markAuthenticatedLocal();
    mockGetCurrentUser.mockResolvedValue({
      id: "u1",
      full_name: "Jane",
      email: "jane@example.com",
      role_id: 1,
      division_id: null,
      contect_number: null,
      is_active: true,
    });

    renderRoutes([
      <Route
        key="root"
        path="/"
        element={
          <UserProvider>
            <UserProbe />
            <ProtectedRoute>
              <span>Protected</span>
            </ProtectedRoute>
          </UserProvider>
        }
      />,
      <Route key="signin" path="/signin" element={<span>Sign-in page</span>} />,
    ], ["/"]);

    // Wait for the provider's fetchCurrentUser() to settle.
    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Protected")).toBeInTheDocument();

    // --- Simulate the interceptor dispatching session expiry ---
    act(() => {
      notifySessionExpired();
    });

    // The provider's event listener clears currentUser → ProtectedRoute
    // redirects to /signin.
    expect(screen.getByTestId("probe").textContent).toBe("none");
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    expect(screen.getByText("Sign-in page")).toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).toBe("/signin");

    // And the persisted flag is gone too, so the next reload won't re-trigger.
    expect(localStorage.getItem("auth:authenticated")).toBeNull();
    expect(AUTH_SESSION_EXPIRED).toBe("auth:session-expired");
  });
});

function markAuthenticatedLocal() {
  localStorage.setItem("auth:authenticated", "true");
}
