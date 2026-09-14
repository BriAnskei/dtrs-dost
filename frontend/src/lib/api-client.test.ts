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
 *        - `notifySessionExpired()`     → dispatches window event `auth:session-expired`
 *        The latter is consumed by `UserProvider` (see user-provider.test.tsx)
 *        to clear `currentUser`, which then makes `ProtectedRoute` redirect to
 *        /signin.
 *
 *   The 401 handler is gated on `isAuthenticated()` — i.e. "did the user have
 *   a session *before* this request?".  With the localStorage-backed flag that
 *   now survives reloads, the toast fires on a fresh page load; with the old
 *   in-memory flag it never did.  The "does NOT toast … no session" test pins
 *   that contract in the negative.
 *
 * APPROACH / MOCKING STRATEGY:
 *   - No real HTTP.  A custom axios adapter returns scripted responses.
 *   - For non-2xx statuses the adapter builds a real `AxiosError` (mirroring
 *     axios's own `settle()` in dist/axios.js) and rejects with it.  This
 *     guarantees the response *error* interceptor fires, regardless of any
 *     `validateStatus` quirk in the test environment.
 *   - `authenticationService.refresh` is mocked so we control success/failure
 *     of the rotation step independently of the transport.
 *   - `vi.resetModules()` per test yields a fresh `apiClient` (and a fresh
 *     module-level `isRefreshing` latch) for isolation.
 */

import {
  type AxiosAdapter,
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Hoisted mocks — stable references captured by the mock factories so they
 * survive vi.resetModules() re-imports.
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

type Spec = { status: number; data: unknown };

/**
 * Scripted mock axios adapter.
 *
 * `handlers["METHOD:url"]` is either:
 *   - a single {status, data}  → returned on every call, or
 *   - an array of {status, data} → consumed in order (for "fail once, then
 *     succeed on retry" scenarios).
 *
 * Tracks every call in `.calls` so tests can assert ordering / retry counts.
 */
function makeAdapter(handlers: Record<string, Spec | Spec[]>): AxiosAdapter & {
  calls: InternalAxiosRequestConfig[];
} {
  const calls: InternalAxiosRequestConfig[] = [];
  const counters: Record<string, number> = {};

  const adapter: AxiosAdapter = (config) => {
    calls.push(config);
    const key = `${config.method?.toUpperCase()}:${config.url}`;
    const handler = handlers[key];

    if (!handler) {
      return Promise.resolve(buildResponse(config, 404, { message: "not found" }));
    }

    let spec: Spec;
    if (Array.isArray(handler)) {
      const i = counters[key] ?? 0;
      spec = handler[i];
      counters[key] = i + 1;
    } else {
      spec = handler;
    }

    return buildResponse(config, spec.status, spec.data);
  };

  return Object.assign(adapter, { calls });
}

/**
 * Resolve/reject like axios's own `settle()`.
 * - 2xx  → resolve AxiosResponse
 * - other → reject with a real AxiosError carrying err.config + err.response
 *   so the response *error* interceptor can read `err.response.status` and
 *   `err.config.url`.
 */
function buildResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): Promise<AxiosResponse> {
  const response: AxiosResponse = {
    data,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {},
    config,
    request: {},
  } as AxiosResponse;

  if (status >= 200 && status < 300) {
    return Promise.resolve(response);
  }

  const code =
    status >= 400 && status < 500
      ? AxiosError.ERR_BAD_REQUEST
      : AxiosError.ERR_BAD_RESPONSE;
  const err = new AxiosError(
    `Request failed with status code ${status}`,
    code,
    config,
    {},
    response,
  );
  return Promise.reject(err);
}

/** Re-import api-client fresh so the module-level `isRefreshing` latch resets. */
async function freshApiClient() {
  vi.resetModules();
  const mod = await import("./api-client");
  return mod.apiClient;
}

/** Drive the persisted flag exactly like the real markAuthenticated() does. */
function markAuthenticatedLocal() {
  localStorage.setItem("auth:authenticated", "true");
}

function listenExpired() {
  const spy = vi.fn();
  window.addEventListener("auth:session-expired", spy);
  return spy;
}

const SESSION_EVENT = "auth:session-expired";

describe("api-client response interceptor — session expiry", () => {
  let onExpired: ReturnType<typeof listenExpired>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRefresh.mockReset();
    mockToastError.mockReset();
    localStorage.clear();
    onExpired = listenExpired();
  });

  afterEach(() => window.removeEventListener(SESSION_EVENT, onExpired));

  it("shows toast + dispatches session-expired when refresh token is also expired", async () => {
    /*
     * Real-world scenario: user refreshed the page, the access-token cookie is
     * stale, and the refresh-token cookie is likewise expired/invalid.
     *
     *   GET /user/me            → 401  (access expired)
     *   refresh()               → rejects  (refresh expired, mocked)
     *   → catch → isAuthenticated()===true → toast + notifySessionExpired
     */
    markAuthenticatedLocal();

    const apiClient = await freshApiClient();
    const adapter = makeAdapter({
      "GET:/user/me": { status: 401, data: { message: "Unauthorized" } },
    });
    apiClient.defaults.adapter = adapter;

    mockRefresh.mockRejectedValueOnce(
      Object.assign(new Error("refresh failed"), { response: { status: 401 } }),
    );

    await expect(apiClient.get("/user/me")).rejects.toBeTruthy();

    // Toast fired exactly once with the expected message + stable id.
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(
      "Your session has expired",
      expect.objectContaining({ id: "session-expired" }),
    );

    // Window event fired so UserProvider can null-out currentUser.
    expect(onExpired).toHaveBeenCalledTimes(1);

    // Flag cleared so the next reload won't re-trigger expiry handling.
    expect(localStorage.getItem("auth:authenticated")).toBeNull();

    // Only the original request hit the adapter (refresh is mocked).
    expect(adapter.calls.map((c) => `${c.method}:${c.url}`)).toEqual(["get:/user/me"]);
  });

  it("does NOT toast when there was no prior authenticated session", async () => {
    /*
     * A brand-new visitor (never logged in) hits 401.  There is no "session"
     * to expire, so the app should NOT show an error toast — just let
     * ProtectedRoute bounce them to /signin silently.
     */
    expect(localStorage.getItem("auth:authenticated")).toBeNull();

    const apiClient = await freshApiClient();
    const adapter = makeAdapter({
      "GET:/user/me": { status: 401, data: { message: "Unauthorized" } },
    });
    apiClient.defaults.adapter = adapter;

    mockRefresh.mockRejectedValueOnce(
      Object.assign(new Error("refresh failed"), { response: { status: 401 } }),
    );

    await expect(apiClient.get("/user/me")).rejects.toBeTruthy();

    expect(mockToastError).not.toHaveBeenCalled();
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("retries the original request when refresh succeeds (no toast)", async () => {
    /*
     * Token rotation wins: access token expired, refresh token still valid.
     *   GET /user/me               → 401
     *   refresh()                  → resolves
     *   GET /user/me (retry)        → 200
     */
    markAuthenticatedLocal();

    const apiClient = await freshApiClient();
    const adapter = makeAdapter({
      "GET:/user/me": [
        { status: 401, data: { message: "Unauthorized" } },
        { status: 200, data: { id: "u1", full_name: "Jane" } },
      ],
    });
    apiClient.defaults.adapter = adapter;

    mockRefresh.mockResolvedValueOnce(undefined);

    const res = await apiClient.get("/user/me");

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: "u1", full_name: "Jane" });
    expect(mockToastError).not.toHaveBeenCalled();
    expect(onExpired).not.toHaveBeenCalled();
    // User is still authenticated.
    expect(localStorage.getItem("auth:authenticated")).toBe("true");

    // Two GET /user/me calls (original + retry); refresh is mocked so not here.
    expect(
      adapter.calls.filter((c) => c.method === "get" && c.url === "/user/me"),
    ).toHaveLength(2);
  });

  it("does not attempt refresh for login, logout, or refresh endpoints", async () => {
    /*
     * Guard: never refresh *inside* login / logout / refresh flows — that
     * would recurse or loop.  A 401 on those endpoints just rejects outright.
     */
    const apiClient = await freshApiClient();
    const adapter = makeAdapter({
      "POST:/authentication/login": { status: 401, data: { message: "bad creds" } },
      "POST:/authentication/logout": { status: 401, data: { message: "Unauthorized" } },
      "POST:/authentication/refresh": { status: 401, data: { message: "Unauthorized" } },
    });
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.post("/authentication/login", {})).rejects.toBeTruthy();
    expect(mockRefresh).not.toHaveBeenCalled();

    mockRefresh.mockClear();

    await expect(apiClient.post("/authentication/logout")).rejects.toBeTruthy();
    expect(mockRefresh).not.toHaveBeenCalled();

    // Exactly two adapter calls, in order, no refresh attempted.
    expect(adapter.calls.map((c) => `${c.method}:${c.url}`)).toEqual([
      "post:/authentication/login",
      "post:/authentication/logout",
    ]);
  });
});
