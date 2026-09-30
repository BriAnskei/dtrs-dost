/**
 * UserProvider integration test — the bridge between the toast and the redirect.
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
 * This test pins the middle step: when the `auth:session-expired` event fires,
 * `currentUser` becomes null (so a downstream ProtectedRoute will redirect).
 * Without the localStorage-backed flag (the fix) the event is never dispatched
 * in the first place — so together with api-client.test.ts this locks the whole
 * feature.
 *
 * We keep the assertion surface narrow: a <UserProbe> consumer renders the
 * current email, and we assert it flips to "none" after the event.  The probe
 * lives inside <UserProvider> but on a stable route ("/"), so it stays mounted
 * and reflects the state change in place.
 */

import { AxiosError } from "axios";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { Route } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_SESSION_EXPIRED,
  notifySessionExpired,
} from "../../features/auth/authentication/authentication.events";
import { renderRoutes } from "../../tests/test-utils";
import { UserProvider } from "./user-provider";
import { useUser } from "./use-user";

/*
 * currentUserService.getCurrentUser() is async; mock it to resolve a user on
 * mount so the provider reaches the "authenticated, not loading" state.
 */
const { mockGetCurrentUser } = vi.hoisted(() => ({ mockGetCurrentUser: vi.fn() }));
vi.mock("./current-user.service", () => ({
  currentUserService: { getCurrentUser: mockGetCurrentUser },
}));

/** Reads the same context ProtectedRoute uses; renders the email (or "none"). */
function UserProbe() {
  const { currentUser } = useUser();
  return <span data-testid="probe">{currentUser ? currentUser.email : "none"}</span>;
}

const TEST_USER = {
  id: "u1",
  full_name: "Jane",
  email: "jane@example.com",
  role_id: 1 as const,
  division_id: null,
  contect_number: null,
  is_active: true,
};

describe("UserProvider — session-expiry event integration", () => {
  let onExpired: ReturnType<typeof listen>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetCurrentUser.mockReset();
    localStorage.clear();
    onExpired = listen();
  });

  afterEach(() => window.removeEventListener(AUTH_SESSION_EXPIRED, onExpired));

  it("clears currentUser when the session-expired event fires", async () => {
    /*
     * Mirrors the post-fix world: the user had a session (flag persisted in
     * localStorage from a prior login), so on mount the provider fetches
     * /user/me and resolves the user.  Then the interceptor fires
     * notifySessionExpired() (because the refresh token also expired).
     */
    markAuthenticatedLocal();
    mockGetCurrentUser.mockResolvedValue(TEST_USER);

    renderRoutes(
      <Route
        path="/"
        element={
          <UserProvider>
            <UserProbe />
          </UserProvider>
        }
      />,
      ["/"],
    );

    // Session resolved → probe shows the user's email.
    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("probe").textContent).toBe("jane@example.com");

    // --- Simulate the interceptor dispatching session expiry ---
    // async act() flushes React Query's notification cycle so the context
    // value has settled before we assert.
    await act(async () => {
      notifySessionExpired();
    });

    // The provider's listener cleared currentUser → probe flips to "none".
    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toBe("none");
    });

    // (The persisted "auth:authenticated" flag itself is cleared by the
    // axios interceptor's catch block — see api-client.test.ts.  Here we only
    // verify UserProvider reacted to the event dispatched alongside the toast.)

    // And the window event that UserProvider subscribed to was actually emitted.
    expect(onExpired).toHaveBeenCalledTimes(1);
  });
});

function markAuthenticatedLocal() {
  localStorage.setItem("auth:authenticated", "true");
}

function listen() {
  const spy = vi.fn();
  window.addEventListener(AUTH_SESSION_EXPIRED, spy);
  return spy;
}

/** Renders provider session-state + a Retry button for the network-error tests. */
function SessionProbe() {
  const { currentUser, isLoading, serverError, refetch } = useUser();
  const state = `${isLoading ? "loading" : "idle"}|${
    serverError ? "serverError" : "ok"
  }|${currentUser ? currentUser.email : "none"}`;
  return (
    <>
      <span data-testid="state">{state}</span>
      <button
        data-testid="retry"
        onClick={refetch}
        disabled={!serverError}
      >
        Retry
      </button>
    </>
  );
}

describe("UserProvider — network error keeps the session recoverable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetCurrentUser.mockReset();
    localStorage.clear();
  });

  it("marks serverError on a transport failure (no signin-redirect state)", async () => {
    markAuthenticatedLocal();
    mockGetCurrentUser.mockRejectedValueOnce(
      new AxiosError("connect ECONNREFUSED", AxiosError.ERR_NETWORK),
    );

    renderRoutes(
      <Route
        path="/"
        element={
          <UserProvider>
            <SessionProbe />
          </UserProvider>
        }
      />,
      ["/"],
    );

    // idle (not loading) + serverError true + no user. ProtectedRoute reads
    // this to render <ServerUnavailable /> instead of <Navigate to="/signin" />,
    // which would require serverError === false.
    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe(
        "idle|serverError|none",
      );
    });
  });

  it("refetch triggers a full page reload from the recovery screen", async () => {
    markAuthenticatedLocal();
    // Simulate "server down" so the provider lands in the serverError state —
    // that is what renders the recovery screen with an enabled Retry button.
    mockGetCurrentUser.mockRejectedValueOnce(
      new AxiosError("connect ECONNREFUSED", AxiosError.ERR_NETWORK),
    );

    // refetch is a hard window.location.reload(); stub it so the test doesn't
    // actually navigate away.
    const reload = vi.fn();
    const originalReload = window.location.reload;
    Object.defineProperty(window.location, "reload", {
      configurable: true,
      value: reload,
    });

    try {
      renderRoutes(
        <Route
          path="/"
          element={
            <UserProvider>
              <SessionProbe />
            </UserProvider>
          }
        />,
        ["/"],
      );

      await waitFor(() => {
        expect(screen.getByTestId("state").textContent).toBe(
          "idle|serverError|none",
        );
      });

      // Button is enabled only in the serverError state; clicking it drives the
      // real refetch → window.location.reload().
      fireEvent.click(await screen.findByTestId("retry"));

      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window.location, "reload", {
        configurable: true,
        value: originalReload,
      });
    }
  });
});

/*
 * ─── AUTH + AUTHZ WIRING: claims survive the session round-trip ──────────
 *
 * The UserProvider fetches /user/me and stores the full User object (including
 * its `permissions` claims map) in React Query's cache.  Downstream
 * authorization hooks (usePermissions, Can, PermissionRoute) read from that
 * cache via useUser() → useQuery(CURRENT_USER_QUERY_KEY).
 *
 * These tests verify:
 *
 *   1. A user WITH permission claims is stored in the cache and the claims
 *      are readable via the context — so authz gating works end-to-end.
 *
 *   2. When the session expires (auth:session-expired event from the
 *      api-client interceptor), both the user AND their claims are wiped
 *      from the cache — a user with null claims must fail every permission
 *      check.
 */

import { useUser } from "./use-user";

/**
 * A user with a realistic claims map: full access to user-management.
 * This mirrors what /user/me returns for an admin.
 */
const USER_WITH_CLAIMS = {
  id: "u-2",
  full_name: "Admin User",
  email: "admin@example.com",
  role_id: 2 as const,
  division_id: null,
  contact_number: null,
  position: null,
  is_active: true,
  permissions: {
    user_management_permissions: {
      view: true,
      add: true,
      edit: false,
      reset_password: true,
      deactivate: false,
      reactivate: false,
      delete: false,
    },
  },
};

/**
 * Renders inside UserProvider and reads the live currentUser + its
 * claims from the context (the same path usePermissions/Can/PermissionRoute use).
 */
function ClaimsProbe() {
  const { currentUser } = useUser();
  const canView = currentUser?.permissions.user_management_permissions?.view;
  const canDelete = currentUser?.permissions.user_management_permissions?.delete;
  return (
    <span data-testid="claims">
      {currentUser ? `${currentUser.email}|view:${String(canView)}|delete:${String(canDelete)}` : "none"}
    </span>
  );
}

describe("UserProvider — authorization claims wiring", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetCurrentUser.mockReset();
    localStorage.clear();
  });

  it("stores a user with permission claims in the cache, readable via context", async () => {
    /*
     * Auth → authz handoff: /user/me returns a User whose `permissions`
     * map carries claim flags.  The provider caches the full object via
     * queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user), so any
     * consumer of useUser() (usePermissions, Can, PermissionRoute) sees
     * the claims immediately — no extra fetch needed.
     */
    markAuthenticatedLocal();
    mockGetCurrentUser.mockResolvedValue(USER_WITH_CLAIMS);

    renderRoutes(
      <Route
        path="/"
        element={
          <UserProvider>
            <ClaimsProbe />
          </UserProvider>
        }
      />,
      ["/"],
    );

    await waitFor(() => {
      expect(screen.getByTestId("claims").textContent).toBe(
        "admin@example.com|view:true|delete:false",
      );
    });
  });

  it("clears claims when the session-expired event fires (auth → authz wipe)", async () => {
    /*
     * Full auth ↔ authz chain:
     *   1. Provider resolves /user/me → claims cached in context
     *   2. api-client interceptor fires 401 → refresh fails →
     *      notifySessionExpired() → window "auth:session-expired"
     *   3. Provider listener calls setQueryData(null) → claims wiped
     *
     * After step 3, useUser() returns null and every downstream
     * permission check (hasModulePermission, Can, PermissionRoute)
     * returns false — no user, no claims, no access.
     */
    markAuthenticatedLocal();
    mockGetCurrentUser.mockResolvedValue(USER_WITH_CLAIMS);

    renderRoutes(
      <Route
        path="/"
        element={
          <UserProvider>
            <ClaimsProbe />
          </UserProvider>
        }
      />,
      ["/"],
    );

    // Claims resolved and visible.
    await waitFor(() => {
      expect(screen.getByTestId("claims").textContent).toBe(
        "admin@example.com|view:true|delete:false",
      );
    });

    // Simulate the interceptor dispatching session expiry.
    await act(async () => {
      notifySessionExpired();
    });

    // Claims wiped → probe shows "none".
    await waitFor(() => {
      expect(screen.getByTestId("claims").textContent).toBe("none");
    });
  });
});
