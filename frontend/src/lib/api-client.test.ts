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

vi.mock("../features/auth/authentication/service/authentication.service", () => ({
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

describe("api-client response interceptor — network errors", () => {
  /*
   * Transport failure: the request was sent but no response was ever received
   * (server down, offline, DNS, timeout, empty response). The interceptor must
   * toast once, must NOT attempt token refresh, and must NOT fire session-
   * expiry handling — a network error is not an auth problem.
   */
  const networkAdapter: AxiosAdapter = (config) =>
    Promise.reject(
      new AxiosError("connect ECONNREFUSED 127.0.0.1:80", AxiosError.ERR_NETWORK, config),
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRefresh.mockReset();
    mockToastError.mockReset();
    localStorage.clear();
  });

  it("toasts once and skips refresh on a transport failure (server down)", async () => {
    markAuthenticatedLocal();

    const apiClient = await freshApiClient();
    apiClient.defaults.adapter = networkAdapter;

    await expect(apiClient.get("/user/me")).rejects.toBeTruthy();

    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(
      "Could not connect to the server",
      expect.objectContaining({ id: "network-error" }),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does NOT toast on a network failure for the login flow (caller owns it)", async () => {
    const apiClient = await freshApiClient();
    apiClient.defaults.adapter = networkAdapter;

    await expect(apiClient.post("/authentication/login", {})).rejects.toBeTruthy();

    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does NOT toast on a network failure for the login flow (caller owns it)", async () => {
    const apiClient = await freshApiClient();
    apiClient.defaults.adapter = networkAdapter;

    await expect(apiClient.post("/authentication/login", {})).rejects.toBeTruthy();

    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe("api-client response interceptor — 403 Forbidden (authorization)", () => {
  /*
   * AUTH + AUTHZ DISTINCTION:
   *
   *   401 Unauthorized  → the access token is EXPIRED or INVALID.
   *     The interceptor attempts a silent refresh; if that also fails
   *     the session is gone and the "session expired" toast fires.
   *
   *   403 Forbidden      → the token is VALID but the user LACKS the
   *     claim (permission) for this action.  This is an AUTHORIZATION
   *     failure, NOT an authentication failure.  The interceptor must
   *     NOT:
   *       - attempt token refresh (the token is fine)
   *       - show the session-expired toast (the session is still alive)
   *       - clear the auth:authenticated flag
   *       - dispatch the auth:session-expired event
   *
   *     It must simply reject with the 403 AxiosError so the caller
   *     (a mutation hook, route guard, etc.) can handle the denial —
   *     typically by showing an /unauthorized page.
   */

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRefresh.mockReset();
    mockToastError.mockReset();
    localStorage.clear();
  });

  it("rejects with 403 without triggering token refresh", async () => {
    markAuthenticatedLocal();

    const apiClient = await freshApiClient();
    const adapter = makeAdapter({
      "POST:/documents/incoming": { status: 403, data: { message: "Forbidden" } },
    });
    apiClient.defaults.adapter = adapter;

    await expect(
      apiClient.post("/documents/incoming", { title: "test" }),
    ).rejects.toMatchObject({ response: { status: 403 } });

    // No refresh attempted — the token is valid, only the claim is missing.
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does NOT show session-expired toast on 403", async () => {
    markAuthenticatedLocal();

    const apiClient = await freshApiClient();
    const adapter = makeAdapter({
      "GET:/admin/settings": { status: 403, data: { message: "Forbidden" } },
    });
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.get("/admin/settings")).rejects.toMatchObject({
      response: { status: 403 },
    });

    // No session-expired toast — this is an authz denial, not session expiry.
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("does NOT clear the auth flag on 403 (session is still valid)", async () => {
    markAuthenticatedLocal();

    const apiClient = await freshApiClient();
    const adapter = makeAdapter({
      "DELETE:/admin/users/42": { status: 403, data: { message: "Forbidden" } },
    });
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.delete("/admin/users/42")).rejects.toMatchObject({
      response: { status: 403 },
    });

    // The persisted flag survives — the user can still navigate and retry
    // with a different action; only the specific claim was denied.
    expect(localStorage.getItem("auth:authenticated")).toBe("true");
  });

  it("does NOT dispatch session-expired event on 403", async () => {
    const onExpired = vi.fn();
    window.addEventListener("auth:session-expired", onExpired);

    try {
      markAuthenticatedLocal();

      const apiClient = await freshApiClient();
      const adapter = makeAdapter({
        "GET:/admin/settings": { status: 403, data: { message: "Forbidden" } },
      });
      apiClient.defaults.adapter = adapter;

      await expect(apiClient.get("/admin/settings")).rejects.toBeTruthy();

      expect(onExpired).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("auth:session-expired", onExpired);
    }
  });
});

describe("api-client response interceptor — concurrent 401 + single refresh", () => {
  /*
   * MULTI-REQUEST REFRESH COALESCING:
   *
   * When two or more requests fail with 401 at the same time (e.g. the
   * access token expired while the user had multiple tabs open), the
   * interceptor must fire refresh() exactly ONCE and retry all pending
   * requests.  The module-level `isRefreshing` latch guarantees this.
   *
   * If refresh succeeds → all requests are retried and succeed.
   * If refresh fails and the user was authenticated → the session-expired
   * toast fires once (stable id "session-expired" deduplicates), and the
   * auth:session-expired event is dispatched so UserProvider clears the
   * current user.
   */

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRefresh.mockReset();
    mockToastError.mockReset();
    localStorage.clear();
  });

  it("fires refresh exactly once for concurrent 401s, then retries all", async () => {
    markAuthenticatedLocal();

    const apiClient = await freshApiClient();
    const adapter = makeAdapter({
      "GET:/user/me": [
        { status: 401, data: { message: "Unauthorized" } },
        { status: 200, data: { id: "u1", full_name: "Jane" } },
      ],
      "GET:/dashboard/stats": [
        { status: 401, data: { message: "Unauthorized" } },
        { status: 200, data: { views: 100 } },
      ],
    });
    apiClient.defaults.adapter = adapter;

    mockRefresh.mockResolvedValueOnce(undefined);

    // Fire two requests concurrently — both get 401, both should trigger
    // the refresh latch but refresh() is called only once.
    const [resA, resB] = await Promise.all([
      apiClient.get("/user/me"),
      apiClient.get("/dashboard/stats"),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    // Each endpoint was hit twice (original 401 + retry 200).
    expect(
      adapter.calls.filter((c) => c.url === "/user/me"),
    ).toHaveLength(2);
    expect(
      adapter.calls.filter((c) => c.url === "/dashboard/stats"),
    ).toHaveLength(2);
  });

  it("dispatches session-expired once when concurrent refresh also fails", async () => {
    const onExpired = vi.fn();
    window.addEventListener("auth:session-expired", onExpired);

    try {
      markAuthenticatedLocal();

      const apiClient = await freshApiClient();
      const adapter = makeAdapter({
        "GET:/user/me": { status: 401, data: { message: "Unauthorized" } },
        "GET:/dashboard/stats": { status: 401, data: { message: "Unauthorized" } },
      });
      apiClient.defaults.adapter = adapter;

      mockRefresh.mockRejectedValueOnce(
        Object.assign(new Error("refresh failed"), { response: { status: 401 } }),
      );

      // Both requests fail with 401 → one refresh attempt → refresh fails.
      await Promise.allSettled([
        apiClient.get("/user/me"),
        apiClient.get("/dashboard/stats"),
      ]);

      // Toast fires once (stable id "session-expired" deduplicates even
      // though the catch block runs twice).
      expect(mockToastError).toHaveBeenCalledTimes(1);
      expect(mockToastError).toHaveBeenCalledWith(
        "Your session has expired",
        expect.objectContaining({ id: "session-expired" }),
      );

      // Event fires once.
      expect(onExpired).toHaveBeenCalledTimes(1);

      // Auth flag cleared.
      expect(localStorage.getItem("auth:authenticated")).toBeNull();
    } finally {
      window.removeEventListener("auth:session-expired", onExpired);
    }
  });
});
