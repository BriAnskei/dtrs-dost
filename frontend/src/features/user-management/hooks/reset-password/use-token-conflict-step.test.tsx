/**
 * Tests for `useTokenConflictStep` — the sub-hook that resolves a "password
 * reset already pending" conflict.
 *
 * WHY THIS HOOK MATTERS:
 *   If an admin tries to reset a user's password while a reset token is already
 *   in flight, the backend returns a 409. The `useChooseMethodStep` hook
 *   interprets the 409 body and routes to the "conflict" step, which delegates
 *   to this hook: it deletes the existing token, then tells the modal to resume
 *   whichever method the admin originally picked.
 *
 * WHAT WE MOCK:
 *   - `passwordResetService` (../../services/password-reset.service) —
 *     `deletePasswordResetToken` controls success/failure.
 *   - `getErrorMessage` (../../../../lib/api-error) — left REAL; pure function.
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
import { useTokenConflictStep } from "./use-token-conflict-step";

const { mockDeleteToken, mockToast } = vi.hoisted(() => ({
  mockDeleteToken: vi.fn(),
  mockToast: { error: vi.fn() },
}));

vi.mock("../../services/password-reset.service", () => ({
  passwordResetService: { deletePasswordResetToken: mockDeleteToken },
}));

vi.mock("sonner", () => ({
  toast: mockToast,
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useTokenConflictStep", () => {
  const onResolved = vi.fn();

  beforeEach(() => {
    mockDeleteToken.mockReset();
    mockToast.error.mockReset();
    onResolved.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes the existing token and calls onResolved with the pending method", async () => {
    /*
     * On success: deletePasswordResetToken(existingId) is called, then
     * onResolved(pendingMethod) fires so the modal resumes the original flow
     * (direct or link).
     */
    mockDeleteToken.mockResolvedValueOnce(undefined);

    const client = makeClient();
    const { result } = renderHook(() => useTokenConflictStep({ onResolved }), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.resolveAndRetry("conflict-token-id", "link");
    });

    expect(mockDeleteToken).toHaveBeenCalledWith("conflict-token-id");
    expect(onResolved).toHaveBeenCalledWith("link");

    client.clear();
  });

  it("isResolvingConflict is true during the delete mutation, false after", async () => {
    /*
     * The conflict button shows "Cancelling…" and is disabled while
     * `isResolvingConflict` is true, preventing double-submission of the
     * delete request.
     */
    let resolveDelete!: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    mockDeleteToken.mockReturnValueOnce(pendingPromise);

    const client = makeClient();
    const { result } = renderHook(() => useTokenConflictStep({ onResolved }), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.resolveAndRetry("conflict-token-id", "direct");
    });

    // Flush React Query v5's setTimeout(0) notification so the
    // useSyncExternalStore re-render propagates isPending=true.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isResolvingConflict).toBe(true);

    await act(async () => {
      resolveDelete();
    });

    // Flush the post-resolution notification.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isResolvingConflict).toBe(false);
    client.clear();
  });

  it("resolves with 'direct' method (not just 'link')", async () => {
    /*
     * The pending method could be 'direct' — verify the callback receives
     * the correct method so the modal resumes the right flow.
     */
    mockDeleteToken.mockResolvedValueOnce(undefined);

    const client = makeClient();
    const { result } = renderHook(() => useTokenConflictStep({ onResolved }), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.resolveAndRetry("conflict-token-id", "direct");
    });

    expect(onResolved).toHaveBeenCalledWith("direct");

    client.clear();
  });

  it("toasts an error and does NOT call onResolved when deletion fails", async () => {
    /*
     * If the delete itself fails (e.g. the token was already consumed, or
     * a network error), the hook must NOT clear the conflict step — the user
     * needs to see the error and retry. `onResolved` is never called.
     */
    mockDeleteToken.mockRejectedValueOnce(
      new AxiosError("Server error", AxiosError.ERR_BAD_RESPONSE, undefined, undefined, {
        data: { message: "Could not cancel reset request." },
        status: 500,
        statusText: "Error",
        headers: {},
        config: {} as never,
        request: {},
      }),
    );

    const client = makeClient();
    const { result } = renderHook(() => useTokenConflictStep({ onResolved }), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.resolveAndRetry("conflict-token-id", "link");
    });

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledTimes(1));
    expect(mockToast.error).toHaveBeenCalledWith("Could not cancel reset request.");
    expect(onResolved).not.toHaveBeenCalled();

    client.clear();
  });
});
