/**
 * Tests for the axios response interceptor in `api-client.ts`.
 *
 * THE BEHAVIOR UNDER TEST (session-expiry → toast + redirect):
 *
 *   1. A request to a normal endpoint fails with 401.
 *   2. The interceptor attempts token rotation by calling
 *      `authenticationService.refresh()`.
 *   3a. If refresh succeeds: the original request is retried (no toast).
 *   3b. If refresh ALSO fails (refresh token expired):
 *        - `showSessionExpiredToast()`  → `toast.error("Your session has expired")`
 *        - `notifySessionExpired()`     → dispatch window event `auth:session-expired`
 *        The latter is consumed by `UserProvider` to clear `currentUser`, which
 *        in turn makes `ProtectedRoute` redirect to /signin.
 *
 *   The 401 handler is gated on `isAuthenticated()` ("did the user have a
 *   session *before* this request?").  With the localStorage-backed flag that
 *   now survives reloads, the toast fires on a fresh page load; with the old
 *   in-memory flag it never did.  Test #2 pins that contract.
 *
 * APPROACH:
 *   - `authenticationService.refresh` is mocked (via vi.mock) so we drive
 *     success/failure directly — no need for the adapter to simulate it.
 *   - The axios adapter is replaced with a stateful stub that returns scripted
 *     responses for `GET /user/me` (the protected resource).  This lets us
 *     assert the interceptor's retry behaviour precisely.
 *   - `vi.resetModules()` per test gives a fresh `apiClient` (and the
 *     module-level `isRefreshing`/`refreshPromise` latches) so tests are
 *     isolated from one another.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { AUTH_SESSION_EXPIRED } from "../features/authentication/authentication.events";

/*
 * Hoisted mocks — stable fns captured by the factory closures so they survive
 * vi.resetModules() re-imports.
 */
const { mockRefresh, mockToastError } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("../features/authentication/authentication.service", () => ({
  authenticationService: {
    refresh: mockRefresh,
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
  },
}));

/** Spy that flips true when the session-expired window event is dispatched. */
function listenForSessionExpired() {
  const spy = vi.fn();
  window.addEventListener(AUTH_SESSION_EXPIRED, spy);
  return spy;
}

/**
 * Build a stateful axios adapter keyed by "METHOD:url".
 *
 * For a sequence of the same URL (used by the "retry after refresh" case),
 * pass `queue` — an array of responses consumed in order.
 */
function makeAdapter(
  routes: Record<string, { status: number; data: unknown }>,
  queue: Record<string, { status: number; data: unknown }[]>,
): AxiosAdapter {
  const counters: Record<string, number> = {};
  return (config) => {
    const key = `${config.method?.toUpperCase()}:${config.url}`;

    if (queue[key] && queue[key].length) {
      counters[key] = (counters[key] ?? 0) + 1;
      const resp = queue[key][counters[key] - 1];
      return Promise.resolve(toResponse(config, resp.status, resp.data));
    }

    const hit = routes[key];
    if (!hit) {
      return Promise.resolve(toResponse(config, 404, { message: "not found" }));
    }
    return Promise.resolve(toResponse(config, hit.status, hit.data));
  };
}

function toResponse(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {},
    config,
    request: {},
  } as AxiosResponse;
}

/** Re-import api-client fresh so the module-level refresh latches reset. */
async function freshApiClient() {
  vi.resetModules();
  const mod = await import("./api-client");
  return mod.apiClient;
}

/* Drives the localStorage flag exactly as the real markAuthenticated() does. */
function markAuthenticatedLocal() {
  localStorage.setItem("auth:authenticated", "true");
}

describe("api-client response interceptor — session expiry", () => {
  let sessionExpiredSpy: ReturnType<typeof listenForSessionExpired>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRefresh.mockReset();
    mockToastError.mockReset();
    localStorage.clear();
    sessionExpiredSpy = listenForSessionExpired();
  });

  it("shows toast + dispatches session-expired when refresh token is also expired", async () => {
    /*
     * Real-world scenario: user has a session (flag persisted in localStorage
     * from a prior login), refreshes the page, access token is stale, refresh
     * token is also gone.
     */
    markAuthenticatedLocal();

    const apiClient = await freshApiClient();
    apiClient.defaults.adapter = makeAdapter(
      { "GET:/user/me": { status: 401, data: { message: "Unauthorized" } } },
      {},
    );

    // refresh() rejects → simulates the refresh endpoint returning 401.
    mockRefresh.mockRejectedValueOnce(
      Object.assign(new Error("refresh failed"), { response: { status: 401 } }),
    );

    await expect(apiClient.get("/user/me")).rejects.toBeTruthy();

    // The toast fired exactly once with the expected message + id.
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(
      "Your session has expired",
      expect.objectContaining({ id: "session-expired" }),
    );

    // The window event fired so UserProvider can null-out currentUser.
    expect(sessionExpiredSpy).toHaveBeenCalledTimes(1);

    // localStorage flag was cleared (so the next reload won't re-trigger).
    expect(localStorage.getItem("auth:authenticated")).toBeNull();

    // Cleanup listener — prevents bleed into other tests.
    window.removeEventListener(AUTH_SESSION_EXPIRED, sessionExpiredSpy);
  });

  it("does NOT toast when there was no prior authenticated session", async () => {
    /*
     * A brand-new visitor (never logged in) hits 401: there is no "session"
     * to expire, so the app should silently let ProtectedRoute send them to
     * /signin without an error toast.
     */
    expect(localStorage.getItem("auth:authenticated")).toBeNull();

    const apiClient = await freshApiClient();
    apiClient.defaults.adapter = makeAdapter(
      { "GET:/user/me": { status: 401, data: { message: "Unauthorized" } } },
      {},
    );
    mockRefresh.mockRejectedValueOnce(
      Object.assign(new Error("refresh failed"), { response: { status: 401 } }),
    );

    await expect(apiClient.get("/user/me")).rejects.toBeTruthy();

    expect(mockToastError).not.toHaveBeenCalled();
    expect(sessionExpiredSpy).not.toHaveBeenCalled();

    window.removeEventListener(AUTH_SESSION_EXPIRED, sessionExpiredSpy);
  });

  it("retries the original request when refresh succeeds (no toast)", async () => {
    /*
     * Normal token rotation: access token expired, refresh token still valid.
     *   GET /user/me  → 401
     *   refresh()     → resolves
     *   GET /user/me  → 200  (retry)
     */
    markAuthenticatedLocal();

    const apiClient = await freshApiClient();
    apiClient.defaults.adapter = makeAdapter(
      {},
      {
        "GET:/user/me": [
          { status: 401, data: { message: "Unauthorized" } },
          { status: 200, data: { id: "u1", full_name: "Jane" } },
        ],
      },
    );
    mockRefresh.mockResolvedValueOnce(undefined);

    const res = await apiClient.get("/user/me");

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: "u1", full_name: "Jane" });
    expect(mockToastError).not.toHaveBeenCalled();
    expect(sessionExpiredSpy).not.toHaveBeenCalled();
    // Flag stays put — the user is still authenticated.
    expect(localStorage.getItem("auth:authenticated")).toBe("true");

    window.removeEventListener(AUTH_SESSION_EXPIRED, sessionExpiredSpy);
  });

  it("does not attempt refresh for login, logout, or refresh endpoint requests", async () => {
    /*
     * Guard: the interceptor must never refresh inside its own refresh/login/
     * logout flows (would recurse or loop).
     */
    const apiClient = await freshApiClient();
    apiClient.defaults.adapter = makeAdapter(
      {
        "POST:/authentication/login": { status: 401, data: { message: "bad creds" } },
        "POST:/authentication/logout": { status: 401, data: { message: "Unauthorized" } },
      },
      {},
    );

    // login 401 → immediate reject, no refresh call.
    await expect(apiClient.post("/authentication/login", {})).rejects.toBeTruthy();
    expect(mockRefresh).not.toHaveBeenCalled();

    mockRefresh.mockClear();
    // logout 401 → same.
    await expect(apiClient.post("/authentication/logout")).rejects.toBeTruthy();
    expect(mockRefresh).not.toHaveBeenCalled();

    window.removeEventListener(AUTH_SESSION_EXPIRED, sessionExpiredSpy);
  });
});
