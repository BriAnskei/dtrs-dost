/**
 * Tests for `useChooseMethodStep` — the sub-hook that decides whether to do a
 * direct password reset or generate a reset link, and detects conflicts (an
 * existing reset token already in flight for the same user).
 *
 * WHY THIS HOOK MATTERS:
 *   Before creating a new reset link, the admin must check whether a reset is
 *   already pending. Only one reset process per user is allowed; if one exists,
 *   the flow routes to a "conflict" step instead. This hook owns that decision
 *   and the `isCheckingMethod` loading flag that shows "Checking…" in the UI.
 *
 * WHAT WE MOCK:
 *   - `passwordResetService` (../../services/password-reset.service) —
 *     `getByUserId` and `createResetRequest` control the two mutation paths.
 *   - `getConflictBody` and `getErrorMessage` (../../../../lib/api-error) —
 *     `getConflictBody` is mocked to control the 409-conflict branch;
 *     `getErrorMessage` is left REAL (pure).
 *   - `sonner` (toast) — assert error surfacing.
 *
 * react-query runs through a real QueryClient (retry=false).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { passwordResetService } from "../../services/password-reset.service";
import { useChooseMethodStep } from "./use-choose-method";

const { mockGetByUserId, mockCreateResetRequest, mockGetConflictBody, mockToast } =
  vi.hoisted(() => ({
    mockGetByUserId: vi.fn(),
    mockCreateResetRequest: vi.fn(),
    mockGetConflictBody: vi.fn(),
    mockToast: { error: vi.fn() },
  }));

vi.mock("../../services/password-reset.service", () => ({
  getConflictBody: mockGetConflictBody,
  passwordResetService: {
    getByUserId: mockGetByUserId,
    createResetRequest: mockCreateResetRequest,
  },
}));

// `getErrorMessage` is a pure function — let the real implementation run.
// (Removed mock that incorrectly returned err.message for plain Errors.)

vi.mock("sonner", () => ({
  toast: mockToast,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";

const EXISTING_TOKEN = {
  id: "token-1",
  user_id: USER_ID,
  expires_at: "2025-12-31T23:59:59Z",
};

const NEW_LINK_RESPONSE = {
  id: "token-2",
  token: "abc123reset-token",
  expires_at: "2025-12-31T23:59:59Z",
};

const CONFLICT_BODY = {
  message: "PASSWORD_RESET_ALREADY_EXISTS",
  error: "PASSWORD_RESET_ALREADY_EXISTS" as const,
  id: "token-existing",
  expires_at: "2025-12-31T23:59:59Z",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/**
 * Build the callback props that the `useResetPasswordModal` hook passes in.
 * Tests can override individual callbacks to assert call arguments.
 */
function makeCallbacks() {
  return {
    onExistingTokenFound: vi.fn(),
    onDirectReady: vi.fn(),
    onLinkCreated: vi.fn(),
  };
}

async function settle(fn: () => void) {
  await act(async () => {
    fn();
    await new Promise((r) => setTimeout(r, 0));
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useChooseMethodStep", () => {
  beforeEach(() => {
    mockGetByUserId.mockReset();
    mockCreateResetRequest.mockReset();
    mockGetConflictBody.mockReset();
    mockToast.error.mockReset();
  });

  describe("selectMethod — direct", () => {
    it("calls onDirectReady when no existing token is found", async () => {
      /*
       * No existing reset token → proceedWithMethod("direct") → onDirectReady().
       * The admin is taken straight to the password input form.
       */
      mockGetByUserId.mockResolvedValueOnce(null);

      const client = makeClient();
      const callbacks = makeCallbacks();
      const { result } = renderHook(() => useChooseMethodStep({ userId: USER_ID, ...callbacks }), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        await result.current.selectMethod("direct");
      });

      expect(mockGetByUserId).toHaveBeenCalledWith(USER_ID);
      expect(callbacks.onDirectReady).toHaveBeenCalledTimes(1);
      expect(callbacks.onExistingTokenFound).not.toHaveBeenCalled();
      expect(mockCreateResetRequest).not.toHaveBeenCalled();

      client.clear();
    });
  });

  describe("selectMethod — link", () => {
    it("creates a reset link and calls onLinkCreated when no existing token is found", async () => {
      /*
       * No existing token → proceedWithMethod("link") → createResetRequest
       * resolves → onSuccess(onLinkCreated) fires with the response data.
       */
      mockGetByUserId.mockResolvedValueOnce(null);
      mockCreateResetRequest.mockResolvedValueOnce(NEW_LINK_RESPONSE);

      const client = makeClient();
      const callbacks = makeCallbacks();
      const { result } = renderHook(() => useChooseMethodStep({ userId: USER_ID, ...callbacks }), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        await result.current.selectMethod("link");
      });

      await waitFor(() => expect(mockCreateResetRequest).toHaveBeenCalledTimes(1));
      expect(mockCreateResetRequest).toHaveBeenCalledWith(USER_ID);
      // React Query v5 onSuccess passes (data, variables, context, …extra).
      // For `mutate()` with no options, variables=undefined, context=undefined,
      // and a 4th arg is the internal QueryClient context object we ignore.
      await waitFor(() =>
        expect(callbacks.onLinkCreated).toHaveBeenCalledWith(
          NEW_LINK_RESPONSE,
          undefined,
          undefined,
          expect.anything(),
        ),
      );

      client.clear();
    });

    it("isCheckingMethod is true while the existence check is pending", async () => {
      /*
       * During the checkExistingMutation the UI shows "Checking…" — tested via
       * isCheckingMethod which ORs both mutation pending states.
       */
      let resolveGet!: (value: typeof EXISTING_TOKEN) => void;
      const pending = new Promise<typeof EXISTING_TOKEN>((resolve) => {
        resolveGet = resolve;
      });
      mockGetByUserId.mockReturnValueOnce(pending);

      const client = makeClient();
      const callbacks = makeCallbacks();

      const { result } = renderHook(() => useChooseMethodStep({ userId: USER_ID, ...callbacks }), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        // selectMethod is async; it won't resolve until getByUserId does.
        void result.current.selectMethod("link");
        // Let the mutation start.
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.isCheckingMethod).toBe(true);

      // Resolve and watch isCheckingMethod drop.
      // Two flushes needed: resolveGet resolves the mutation Promise (microtask),
      // which makes React Query schedule a SECOND setTimeout(0) notification
      // that the first flush hasn't propagated yet.
      await act(async () => {
        resolveGet(EXISTING_TOKEN);
        await new Promise((r) => setTimeout(r, 0));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.isCheckingMethod).toBe(false);
      client.clear();
    });
  });

  describe("selectMethod — conflict (existing token found)", () => {
    it("calls onExistingTokenFound with the existing token and the chosen method", async () => {
      /*
       * An existing reset token is found → the hook routes to the conflict
       * step instead of proceeding with the selected method.
       */
      mockGetByUserId.mockResolvedValueOnce(EXISTING_TOKEN);

      const client = makeClient();
      const callbacks = makeCallbacks();
      const { result } = renderHook(() => useChooseMethodStep({ userId: USER_ID, ...callbacks }), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        await result.current.selectMethod("link");
      });

      expect(callbacks.onExistingTokenFound).toHaveBeenCalledWith(
        EXISTING_TOKEN,
        "link",
      );
      expect(callbacks.onDirectReady).not.toHaveBeenCalled();
      expect(mockCreateResetRequest).not.toHaveBeenCalled();

      client.clear();
    });

    it("reports conflict for 'direct' method too, not just 'link'", async () => {
      /*
       * The conflict check is the same regardless of which method the admin
       * picks — if a token exists, the conflict step fires.
       */
      mockGetByUserId.mockResolvedValueOnce(EXISTING_TOKEN);

      const client = makeClient();
      const callbacks = makeCallbacks();
      const { result } = renderHook(() => useChooseMethodStep({ userId: USER_ID, ...callbacks }), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        await result.current.selectMethod("direct");
      });

      expect(callbacks.onExistingTokenFound).toHaveBeenCalledWith(
        EXISTING_TOKEN,
        "direct",
      );

      client.clear();
    });
  });

  describe("selectMethod — link creation error with 409 conflict", () => {
    it("extracts the conflict body and routes to onExistingTokenFound", async () => {
      /*
       * Edge case: no token found during the initial check, but by the time
       * createResetRequest fires the backend returns 409 (race condition).
       * getConflictBody extracts { id, expires_at } from the error, and the
       * hook routes to the conflict step so the admin can retry.
       */
      mockGetByUserId.mockResolvedValueOnce(null);

      const axiosErr = new AxiosError(
        "Conflict",
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        { data: CONFLICT_BODY, status: 409, statusText: "Conflict", headers: {}, config: {} as never, request: {} },
      );
      mockCreateResetRequest.mockRejectedValueOnce(axiosErr);
      mockGetConflictBody.mockReturnValue(CONFLICT_BODY);

      const client = makeClient();
      const callbacks = makeCallbacks();
      const { result } = renderHook(() => useChooseMethodStep({ userId: USER_ID, ...callbacks }), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        await result.current.selectMethod("link");
      });

      await waitFor(() =>
        expect(callbacks.onExistingTokenFound).toHaveBeenCalledWith(
          { id: CONFLICT_BODY.id, user_id: USER_ID, expires_at: CONFLICT_BODY.expires_at },
          "link",
        ),
      );
      expect(mockToast.error).not.toHaveBeenCalled();

      client.clear();
    });
  });

  describe("selectMethod — link creation error (non-conflict)", () => {
    it("toasts an error when createResetRequest fails without a 409 body", async () => {
      /*
       * If createResetRequest fails for any reason OTHER than a 409 conflict,
       * getConflictBody returns null and the hook shows a toast.error.
       * The flow does NOT advance to the link step.
       */
      mockGetByUserId.mockResolvedValueOnce(null);
      mockGetConflictBody.mockReturnValue(null); // no conflict body
      mockCreateResetRequest.mockRejectedValueOnce(new Error("Server exploded"));

      const client = makeClient();
      const callbacks = makeCallbacks();
      const { result } = renderHook(() => useChooseMethodStep({ userId: USER_ID, ...callbacks }), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        await result.current.selectMethod("link");
      });

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledTimes(1));
      expect(mockToast.error).toHaveBeenCalledWith("Could not generate a reset link.");
      expect(callbacks.onLinkCreated).not.toHaveBeenCalled();

      client.clear();
    });
  });

  describe("proceedWithMethod", () => {
    it("calls onDirectReady for 'direct' without checking existing", () => {
      /*
       * proceedWithMethod is the "resume after conflict cancellation" path
       * — it skips the existence check and goes straight to the method.
       */
      const client = makeClient();
      const callbacks = makeCallbacks();
      const { result } = renderHook(() => useChooseMethodStep({ userId: USER_ID, ...callbacks }), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.proceedWithMethod("direct");
      });

      expect(callbacks.onDirectReady).toHaveBeenCalledTimes(1);
      expect(mockGetByUserId).not.toHaveBeenCalled();

      client.clear();
    });

    it("calls createResetRequest for 'link' without checking existing", async () => {
      /*
       * proceedWithMethod("link") fires createResetRequest directly.
       */
      mockCreateResetRequest.mockResolvedValueOnce(NEW_LINK_RESPONSE);

      const client = makeClient();
      const callbacks = makeCallbacks();
      const { result } = renderHook(() => useChooseMethodStep({ userId: USER_ID, ...callbacks }), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.proceedWithMethod("link");
      });

      // Flush React Query v5's setTimeout(0) notification so the mutation
      // function actually executes and the state updates propagate.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockCreateResetRequest).toHaveBeenCalledWith(USER_ID);

      await waitFor(() =>
        expect(callbacks.onLinkCreated).toHaveBeenCalledWith(
          NEW_LINK_RESPONSE,
          undefined,
          undefined,
          expect.anything(),
        ),
      );

      client.clear();
    });
  });
});
