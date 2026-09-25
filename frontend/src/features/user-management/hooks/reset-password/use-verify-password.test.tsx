/**
 * Tests for `useVerifyPasswordStep` — the admin-password verification gate used
 * by BOTH the ResetPasswordModal and DeactivateUserModal flows.
 *
 * WHY THIS HOOK MATTERS:
 *   Before an admin can reset another user's password or deactivate an account,
 *   they must re-enter their own password. This hook calls
 *   `authenticationService.verifyPassword`, exposes `isVerifying` (a loading
 *   spinner on the "Continue" button), and surfaces errors inline under the
 *   password field. Both modals are gated on this step, so a regression here
 *   breaks password resets AND deactivations.
 *
 * WHAT WE MOCK:
 *   - `authenticationService` (../../../authentication/service/authentication.service)
 *     — controls verifyPassword resolution/rejection.
 *   - `getErrorMessage` (../../../../lib/api-error) — left REAL; it's a pure
 *     function that only reads AxiosError properties, so we feed it a real
 *     AxiosError and assert the exact string it returns.
 *
 * react-query mutation runs through a real QueryClient (retry=false).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticationService } from "../../../authentication/service/authentication.service";
import { useVerifyPasswordStep } from "./use-verify-password";

const { mockVerifyPassword } = vi.hoisted(() => ({
  mockVerifyPassword: vi.fn(),
}));

vi.mock("../../../authentication/service/authentication.service", () => ({
  authenticationService: {
    verifyPassword: mockVerifyPassword,
  },
}));

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

/** Build a real AxiosError with a response body, like the backend would send. */
function axiosError(status: number, message: string) {
  return new AxiosError(message, AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
    data: { message },
    status,
    statusText: "Error",
    headers: {},
    config: {} as never,
    request: {},
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useVerifyPasswordStep", () => {
  const onVerified = vi.fn();

  beforeEach(() => {
    mockVerifyPassword.mockReset();
    onVerified.mockReset();
  });

  afterEach(() => {
    // Clean up QueryClient after each test to avoid cross-test cache bleed.
  });

  it("does not call verifyPassword when the password field is empty", () => {
    /*
     * Client-side guard: empty input must not hit the API at all.
     * The error message "Enter your password to continue." appears inline.
     */
    const client = makeClient();
    const { result } = renderHook(() => useVerifyPasswordStep(onVerified), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.adminPassword).toBe("");

    act(() => {
      result.current.handleVerifyPassword();
    });

    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(result.current.adminPasswordError).toBe("Enter your password to continue.");
    expect(result.current.isVerifying).toBe(false);

    client.clear();
  });

  it("calls verifyPassword and sets isVerifying while the mutation is pending", async () => {
    /*
     * The "Continue" button shows "Verifying…" text and is disabled while
     * `isVerifying` is true. This prevents double-submission.
     */
    let resolveVerify!: (value: { verified: boolean }) => void;
    const pending = new Promise<{ verified: boolean }>((resolve) => {
      resolveVerify = resolve;
    });
    mockVerifyPassword.mockReturnValueOnce(pending);

    const client = makeClient();
    const { result } = renderHook(() => useVerifyPasswordStep(onVerified), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.setAdminPassword("correct-password");
    });

    act(() => {
      result.current.setAdminPassword("correct-password");
    });

    act(() => {
      result.current.handleVerifyPassword();
    });

    // Flush React Query v5's setTimeout(0) notification (macrotask) so
    // the useSyncExternalStore re-render propagates isPending=true.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // While pending, isVerifying is true.
    expect(result.current.isVerifying).toBe(true);

    // Resolve the mutation — onSuccess fires onVerified.
    await act(async () => {
      resolveVerify({ verified: true });
    });

    // Flush the post-resolution notification.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockVerifyPassword).toHaveBeenCalledWith("correct-password");
    expect(result.current.isVerifying).toBe(false);
    expect(onVerified).toHaveBeenCalledTimes(1);

    client.clear();
  });

  it("clears the previous error message when a new attempt starts", async () => {
    /*
     * If the user had a stale error and retries, the error message must
     * disappear immediately (before the new mutation resolves) so the UI
     * doesn't show a stale "Incorrect password." while the new verify is in flight.
     */
    const client = makeClient();
    const { result } = renderHook(() => useVerifyPasswordStep(onVerified), {
      wrapper: makeWrapper(client),
    });

    // Seed an error.
    act(() => {
      result.current.setAdminPasswordError("Incorrect password.");
    });
    expect(result.current.adminPasswordError).toBe("Incorrect password.");

    // Start a new attempt with a valid password.
    mockVerifyPassword.mockResolvedValueOnce({ verified: true });
    act(() => {
      result.current.setAdminPassword("new-password");
    });

    await act(async () => {
      result.current.handleVerifyPassword();
    });

    await waitFor(() => expect(result.current.isVerifying).toBe(false));
    expect(result.current.adminPasswordError).toBeUndefined();

    client.clear();
  });

  it("sets adminPasswordError and does NOT call onVerified when verify fails", async () => {
    /*
     * On a 401/403 from the backend, `getErrorMessage` extracts the server's
     * message. The error appears inline and `onVerified` is never called
     * (keeping the modal on the verify step).
     */
    mockVerifyPassword.mockRejectedValueOnce(
      axiosError(401, "Password is incorrect."),
    );

    const client = makeClient();
    const { result } = renderHook(() => useVerifyPasswordStep(onVerified), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.setAdminPassword("wrong-password");
    });

    await act(async () => {
      result.current.handleVerifyPassword();
    });

    await waitFor(() => expect(result.current.isVerifying).toBe(false));

    expect(result.current.adminPasswordError).toBe("Password is incorrect.");
    expect(onVerified).not.toHaveBeenCalled();
    expect(mockVerifyPassword).toHaveBeenCalledTimes(1);

    client.clear();
  });

  it("uses the fallback message when the error has no server message", async () => {
    /*
     * If the backend returns a non-Axios error (or an AxiosError without a
     * response body), `getErrorMessage` falls back to "Incorrect password.".
     */
    mockVerifyPassword.mockRejectedValueOnce(new Error("Something went wrong"));

    const client = makeClient();
    const { result } = renderHook(() => useVerifyPasswordStep(onVerified), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.setAdminPassword("some-password");
    });

    await act(async () => {
      result.current.handleVerifyPassword();
    });

    await waitFor(() => expect(result.current.isVerifying).toBe(false));
    expect(result.current.adminPasswordError).toBe("Incorrect password.");
    expect(onVerified).not.toHaveBeenCalled();

    client.clear();
  });
});
