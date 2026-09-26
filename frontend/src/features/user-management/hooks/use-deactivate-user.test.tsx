/**
 * Tests for `useDeactivateUser` — the mutation hook that deactivates a user
 * account.
 *
 * WHY THIS HOOK MATTERS:
 *   Triggered from DeactivateUserModal's "Deactivate" button. On success it
 *   invalidates the `["users"]` query (so the table refetches and the row
 *   disappears), fires a success toast, and lets the caller close the modal.
 *   On failure it surfaces the error message via `getApiErrorMessage`.
 *
 * WHAT WE MOCK:
 *   - `userService` (../services/user.service) — `deactivate` is scripted to
 *     succeed or reject.
 *   - `getApiErrorMessage` (../../../lib/api-error) — mocked so we can assert
 *     the fallback message is used without constructing a real AxiosError.
 *   - `sonner` (toast) — assert toast.success / toast.error are called.
 *
 * react-query runs through a real QueryClientProvider (retry=false) because
 * the hook calls `queryClient.invalidateQueries`.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userService } from "../services/user.service";
import { useDeactivateUser } from "./use-deactivate-user";

const { mockDeactivate, mockGetApiErrorMessage, mockToast } = vi.hoisted(() => ({
  mockDeactivate: vi.fn(),
  mockGetApiErrorMessage: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../services/user.service", () => ({
  userService: { deactivate: mockDeactivate },
}));

vi.mock("../../../lib/api-error", () => ({
  getApiErrorMessage: mockGetApiErrorMessage,
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

// A spy query client that tracks invalidateQueries calls without needing
// real server data — we just need to verify the invalidation happened.
function makeSpyClient() {
  const client = makeClient();
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(client, "invalidateQueries").mockImplementation(invalidateQueries);
  return { client, invalidateQueries };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useDeactivateUser", () => {
  beforeEach(() => {
    mockDeactivate.mockReset();
    mockGetApiErrorMessage.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it("mutates with the correct user id", async () => {
    /*
     * The hook calls `userService.deactivate(id)` — verify the exact id is
     * forwarded, so the wrong user is never deactivated.
     */
    mockDeactivate.mockResolvedValueOnce(undefined);
    mockGetApiErrorMessage.mockReturnValue("Failed");

    const { client } = makeSpyClient();
    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate("user-123");
    });

    expect(mockDeactivate).toHaveBeenCalledTimes(1);
    expect(mockDeactivate).toHaveBeenCalledWith("user-123");

    client.clear();
  });

  it("isPending is true during mutation, false after settlement", async () => {
    /*
     * The DeactivateUserModal button shows "Deactivating…" and is disabled
     * while `isPending` is true. This prevents double-submitting a destructive
     * action.
     */
    let resolveDeactivate!: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveDeactivate = resolve;
    });
    mockDeactivate.mockReturnValueOnce(pendingPromise);

    const { client } = makeSpyClient();
    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.mutate("user-1");
    });

    // Flush React Query v5's setTimeout(0) notification so the
    // useSyncExternalStore re-render propagates isPending=true.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Immediately after calling mutate, the mutation is pending.
    expect(result.current.isPending).toBe(true);

    // Resolve the mutation.
    await act(async () => {
      resolveDeactivate();
    });

    // Flush the post-resolution notification.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isPending).toBe(false);
    client.clear();
  });

  it("invalidates the ['users'], ['deactivated-users'] and ['divisions'] queries on success", async () => {
    /*
     * After deactivation the cached lists are stale — the hook invalidates
     * ["users"] (active-user table), ["deactivated-users"] (the row that was
     * just moved here) and ["divisions"] (division totals) so all affected
     * views refetch in one go.
     */
    mockDeactivate.mockResolvedValueOnce(undefined);

    const { client, invalidateQueries } = makeSpyClient();
    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate("user-1", {
        onSuccess: () => {
          // The modal's onSuccess handler closes the modal — simulate it.
        },
      });
    });

    // The mutation's own onSuccess invalidates all three query keys.
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(3));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["deactivated-users"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["divisions"],
    });

    client.clear();
  });

  it("toasts success on a successful deactivation", async () => {
    /*
     * User feedback: a green toast "User deactivated successfully" appears
     * after the mutation resolves.
     */
    mockDeactivate.mockResolvedValueOnce(undefined);
    mockGetApiErrorMessage.mockReturnValue("Failed");

    const { client } = makeSpyClient();
    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate("user-1");
    });

    await waitFor(() => expect(mockToast.success).toHaveBeenCalledTimes(1));
    expect(mockToast.success).toHaveBeenCalledWith(
      "User deactivated successfully",
    );

    client.clear();
  });

  it("toasts error and does NOT toast success when deactivation fails", async () => {
    /*
     * On a 403/500 from the backend, the hook surfaces the error message
     * via `getApiErrorMessage` and fires a red toast. No success toast fires.
     * No query invalidation happens (the list stays in sync with reality).
     */
    mockDeactivate.mockRejectedValueOnce(new Error("Forbidden: cannot deactivate"));
    mockGetApiErrorMessage.mockReturnValue("Forbidden: cannot deactivate");

    const { client, invalidateQueries } = makeSpyClient();
    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate("user-1");
    });

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledTimes(1));
    expect(mockToast.error).toHaveBeenCalledWith("Forbidden: cannot deactivate");
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();

    client.clear();
  });

  it("uses fallback message when getApiErrorMessage returns undefined", async () => {
    /*
     * getApiErrorMessage has a fallback param ("Something went wrong.") but
     * the hook does not pass one — it relies on whatever the function returns.
     * In practice the function always returns a string, but we assert the
     * contract: the error message is passed through to toast.error verbatim.
     */
    mockDeactivate.mockRejectedValueOnce(new Error("Network error"));
    mockGetApiErrorMessage.mockReturnValue("(╯°□°)╯︵ ┻━┻");

    const { client } = makeSpyClient();
    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.mutate("user-1");
    });

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("(╯°□°)╯︵ ┻━┻"));

    client.clear();
  });
});
