/**
 * Unit tests for `useResetPasswordFlow` — the hook that backs the
 * `/reset-password/:token` public route (`ResetPasswordForm.tsx`).
 *
 * This route is public (no auth) yet stateful: it verifies a one-time reset
 * token, runs a client-side expiry countdown, validates the new-password form,
 * then POSTs the new password.  Those branches are fragile and previously
 * untested, so this file pins the contract end-to-end behind a mocked service
 * layer (no real network, no real router).
 *
 * WHAT WE MOCK:
 *   - `authPasswordResetService` (verifyToken / resetPassword) — pure unit
 *     isolation; we script success vs. 400-expired vs. 500.
 *   - `sonner`'s `toast` — assert success/error surfaced to the user.
 *   `getErrorMessage` (from api-error) is left real: it's pure and only reads
 *   the AxiosError we hand it.
 *
 * react-query runs through a real `QueryClientProvider` with retry=false so
 * `useQuery`/`useMutation` settle deterministically; `waitFor` gates assertions.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authPasswordResetService } from "../service/authPassword-reset.service";
import { useResetPasswordFlow } from "./use-authReset-password";

/*
 * Hoisted mocks — stable references captured before any import so they survive
 * vitest's hoisted `vi.mock` calls.
 */
const { mockVerifyToken, mockResetPassword, mockToast } = vi.hoisted(() => ({
  mockVerifyToken: vi.fn(),
  mockResetPassword: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../service/authPassword-reset.service", () => ({
  authPasswordResetService: {
    verifyToken: mockVerifyToken,
    resetPassword: mockResetPassword,
  },
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

/** A verified token whose expiry sits 5 min in the future. */
const VALID_VERIFY_RESPONSE = {
  valid: true as const,
  resetToken: {
    id: "rt-1",
    user_id: "u-1",
    token_hash: "hash",
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  },
};

/** 404 error body a server would return for a stale token. */
function verifyError(status: number, message: string, code: string) {
  return new AxiosError(message, code, undefined, undefined, {
    data: { message },
    status,
    statusText: "Error",
    headers: {},
    config: {} as never,
    request: {},
  });
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/** Prime the hook into the "token verified, form ready" state. */
function primeVerified() {
  mockVerifyToken.mockResolvedValueOnce(VALID_VERIFY_RESPONSE);
}

async function getReady() {
  const queryClient = makeQueryClient();
  primeVerified();
  const { result } = renderHook(() => useResetPasswordFlow("tok"), {
    wrapper: makeWrapper(queryClient),
  });
  await waitFor(() => expect(result.current.isVerifying).toBe(false));
  await waitFor(() => expect(result.current.isTokenInvalid).toBe(false));
  return { result, queryClient };
}

describe("useResetPasswordFlow", () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockResetPassword.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("token verification", () => {
    it("verifies the token on mount and is verifying while it resolves", async () => {
      /*
       * The query fires immediately (enabled: !!token).  Until verifyToken
       * resolves, `isVerifying` is true.  Resolving clears the loader.
       */
      let resolveVerify!: (value: typeof VALID_VERIFY_RESPONSE) => void;
      const pending = new Promise<typeof VALID_VERIFY_RESPONSE>((res) => {
        resolveVerify = res;
      });
      mockVerifyToken.mockReturnValue(pending);

      const queryClient = makeQueryClient();
      const { result } = renderHook(() => useResetPasswordFlow("good-token"), {
        wrapper: makeWrapper(queryClient),
      });

      expect(result.current.isVerifying).toBe(true);
      expect(result.current.isTokenInvalid).toBe(false);

      await act(async () => resolveVerify(VALID_VERIFY_RESPONSE));
      await waitFor(() => expect(result.current.isVerifying).toBe(false));
      queryClient.clear();
    });

    it("exposes invalid-token state + message when verification fails", async () => {
      mockVerifyToken.mockRejectedValueOnce(
        verifyError(404, "Reset link could not be found.", AxiosError.ERR_BAD_REQUEST),
      );

      const queryClient = makeQueryClient();
      const { result } = renderHook(() => useResetPasswordFlow("bad-token"), {
        wrapper: makeWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isTokenInvalid).toBe(true));
      expect(result.current.tokenErrorMessage).toBe(
        "Reset link could not be found.",
      );
      expect(result.current.isVerifying).toBe(false);
      queryClient.clear();
    });
  });

  describe("password validation", () => {
    it("rejects a password shorter than 8 characters", async () => {
      primeVerified();
      const { result } = renderHook(() => useResetPasswordFlow("tok"), {
        wrapper: makeWrapper(makeQueryClient()),
      });
      await waitFor(() => expect(result.current.isVerifying).toBe(false));

      act(() => {
        result.current.setPassword("short");
        result.current.setConfirmPassword("short");
      });

      // submit attempt must NOT reach the service when validation fails
      await act(async () => {
        result.current.handleSubmit();
      });

      expect(mockResetPassword).not.toHaveBeenCalled();
      expect(result.current.formErrors.password).toBe(
        "Use at least 8 characters.",
      );
    });

    it("rejects when the two passwords do not match", async () => {
      primeVerified();
      const { result } = renderHook(() => useResetPasswordFlow("tok"), {
        wrapper: makeWrapper(makeQueryClient()),
      });
      await waitFor(() => expect(result.current.isVerifying).toBe(false));

      act(() => {
        result.current.setPassword("long-enough");
        result.current.setConfirmPassword("nope-mismatch");
      });

      await act(async () => {
        result.current.handleSubmit();
      });

      expect(mockResetPassword).not.toHaveBeenCalled();
      expect(result.current.formErrors.confirmPassword).toBe(
        "Passwords don't match.",
      );
    });

    it("does not call resetPassword when the password is empty", async () => {
      primeVerified();
      const { result } = renderHook(() => useResetPasswordFlow("tok"), {
        wrapper: makeWrapper(makeQueryClient()),
      });
      await waitFor(() => expect(result.current.isVerifying).toBe(false));

      act(() => {
        result.current.setPassword("");
        result.current.setConfirmPassword("something");
      });

      await act(async () => {
        result.current.handleSubmit();
      });

      expect(mockResetPassword).not.toHaveBeenCalled();
      expect(result.current.formErrors.password).toBe(
        "New password is required.",
      );
    });
  });

  describe("reset submission", () => {
    it("submits and marks resetComplete on success (toasts success)", async () => {
      mockResetPassword.mockResolvedValueOnce(undefined);
      const { result } = await getReady();

      act(() => {
        result.current.setPassword("new-password-123");
        result.current.setConfirmPassword("new-password-123");
      });

      await act(async () => {
        result.current.handleSubmit();
      });

      await waitFor(() => expect(result.current.resetComplete).toBe(true));
      expect(result.current.isSubmitting).toBe(false);
      expect(mockResetPassword).toHaveBeenCalledTimes(1);
      expect(mockResetPassword).toHaveBeenCalledWith({
        token: "tok",
        new_password: "new-password-123",
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        "Your password has been changed.",
      );
    });

    it("treats a 400 during submit as a dead token (expiry state + toast)", async () => {
      /*
       * Edge case: the token was valid on page load but expired by submit.
       * The backend returns 400 — the hook must NOT show a generic password
       * error; it must flip the "invalid/expired" UI and toast.
       */
      mockResetPassword.mockRejectedValueOnce(
        verifyError(400, "Reset link has expired.", AxiosError.ERR_BAD_REQUEST),
      );

      const { result } = await getReady();

      act(() => {
        result.current.setPassword("new-password-123");
        result.current.setConfirmPassword("new-password-123");
      });

      await act(async () => {
        result.current.handleSubmit();
      });

      await waitFor(() => expect(result.current.isExpired).toBe(true));
      expect(result.current.resetComplete).toBe(false);
      expect(result.current.formErrors.password).toBeUndefined();
      expect(mockToast.error).toHaveBeenCalled();
    });
  });
});
