/**
 * Tests for `useUsers` — the infinite-scroll data source for the user-management
 * table.
 *
 * This hook wraps `useInfiniteQuery` around `userService.findAll`, translating
 * cursor-paginated API responses (`{ data, nextCursor }`) into the
 * react-query infinite-query contract that `useUserManagementTable` consumes.
 *
 * WHAT WE MOCK:
 *   - `userService` (../services/user.service) — `findAll` is scripted per-call
 *     so we control page payloads and `nextCursor` values without hitting the
 *     network.
 *
 * react-query runs through a real `QueryClientProvider` (retry=false, gcTime=0)
 * so queries settle deterministically; `waitFor` and `act` gate assertions.
 *
 * SCENARIOS COVERED:
 *   - Initial loading state → resolves on first page
 *   - Filter params (name, role_id, sort) are forwarded correctly
 *   - Cursor paging: `fetchNextPage` advances the cursor
 *   - `hasNextPage` reflects whether `nextCursor` is non-null
 *   - `isFetchingNextPage` toggles during pagination
 *   - Error propagation
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FindUsersParams,
  UserWithRelationResponse,
} from "../types/user.type";
import { userService } from "../services/user.service";
import { useUsers } from "./use-users";

const { mockFindAll } = vi.hoisted(() => ({
  mockFindAll: vi.fn(),
}));

vi.mock("../services/user.service", () => ({
  userService: { findAll: mockFindAll },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/** First page: 2 users, a non-null cursor → there IS a next page. */
const FIRST_PAGE = {
  data: [
    {
      id: "u1",
      full_name: "Alice Reyes",
      email: "alice@peo.gov.ph",
      role: "admin",
      position: "Engineer",
      contact: "09171234567",
      division_name: "Manila",
      created_at: "2025-01-01T08:00:00Z",
    },
    {
      id: "u2",
      full_name: "Bob Santos",
      email: "bob@peo.gov.ph",
      role: "receiver_officer",
      position: "Receiver",
      contact: "09179876543",
      division_name: null,
      created_at: "2025-01-02T09:30:00Z",
    },
  ],
  nextCursor: "cursor-page-2",
};

/** Second (final) page: 1 user, null cursor → no more pages. */
const LAST_PAGE = {
  data: [
    {
      id: "u3",
      full_name: "Charlie Dy",
      email: "charlie@peo.gov.ph",
      role: "division",
      position: "Division Head",
      contact: "09175556666",
      division_name: "Cebu",
      created_at: "2025-01-03T10:00:00Z",
    },
  ],
  nextCursor: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * QueryClient with retry disabled and zero cache time so queries settle
 * deterministically within `waitFor` / `act` without stale data lingering.
 */
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

/** Build a query key the same way the hook does — for assertion convenience. */
function lastCallArg(
  mock: ReturnType<typeof vi.fn>,
): FindUsersParams | undefined {
  return mock.mock.calls[0]?.[0];
}

/**
 * Flush React Query v5's notification chain.
 * v5 uses `notifyManager.schedule` → `setTimeout(callback, 0)` (macrotask)
 * for every state transition. `useSyncExternalStore` (not `useReducer`)
 * detects changes only after the notification actually fires. A single
 * `setTimeout(0)` flush is sometimes insufficient — especially for
 * `useInfiniteQuery` which has an extra observer layer — so we chain
 * multiple flushes to be safe.
 */
async function flushMacrotasks(count = 1) {
  for (let i = 0; i < count; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useUsers", () => {
  afterEach(() => {
    mockFindAll.mockReset();
  });

  it("starts in isLoading state, then resolves with the first page", async () => {
    /*
     * The query fires immediately on mount. Until `findAll` resolves,
     * `isLoading` is true and `data` is undefined — this is the state the
     * table renders skeletons for.
     */
    mockFindAll.mockResolvedValueOnce(FIRST_PAGE);

    const client = makeClient();
    const { result } = renderHook(() => useUsers({}), {
      wrapper: makeWrapper(client),
    });

    // Synchronous: first render is always loading.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // After the mock resolves, isLoading clears and page-0 data appears.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]).toEqual(FIRST_PAGE);

    client.clear();
  });

  it("forwards name, role_id, sort, cursor=undefined and limit=20 on first fetch", async () => {
    /*
     * Verifies the query function spreads the filter object exactly as the
     * hook constructs it: `{ ...filters, cursor: pageParam, limit: 20 }`.
     * `pageParam` is `undefined` on the first page (initialPageParam).
     */
    mockFindAll.mockResolvedValueOnce(FIRST_PAGE);

    const client = makeClient();
    renderHook(() => useUsers({ name: "alice", role_id: 2, sort: "newest" }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(mockFindAll).toHaveBeenCalledTimes(1));

    expect(mockFindAll).toHaveBeenCalledWith({
      name: "alice",
      role_id: 2,
      sort: "newest",
      cursor: undefined,
      limit: PAGE_SIZE,
    });

    client.clear();
  });

  it("appends a second page when fetchNextPage is called with a cursor", async () => {
    /*
     * Pagination flow:
     *   1. First call → FIRST_PAGE (nextCursor = "cursor-page-2")
     *   2. fetchNextPage() → second call with cursor = "cursor-page-2"
     *   3. SECOND_PAGE returns nextCursor = null → hasNextPage becomes false
     */
    mockFindAll.mockResolvedValueOnce(FIRST_PAGE);
    mockFindAll.mockResolvedValueOnce(LAST_PAGE);

    const client = makeClient();
    const { result } = renderHook(() => useUsers({}), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // After page 1: there IS a next page.
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isFetchingNextPage).toBe(false);

    // Trigger pagination.
    await act(async () => {
      await result.current.fetchNextPage();
    });

    // Flush React Query v5's setTimeout(0) notification so the
    // useSyncExternalStore re-render propagates the new page data.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // After page 2: data is appended, no more pages.
    expect(result.current.data?.pages).toHaveLength(2);
    expect(result.current.data?.pages[1]).toEqual(LAST_PAGE);
    expect(result.current.hasNextPage).toBe(false);

    // Second call used the cursor from the first page's response.
    expect(mockFindAll).toHaveBeenNthCalledWith(2, {
      name: undefined,
      role_id: undefined,
      sort: undefined,
      cursor: FIRST_PAGE.nextCursor,
      limit: PAGE_SIZE,
    });

    client.clear();
  });

  it("keeps isFetchingNextPage true during pagination, false after settlement", async () => {
    /*
     * The loading spinner at the bottom of the table ("Loading more…") is
     * driven by `isFetchingNextPage`. It must be true for at least a tick
     * while the second page resolves.
     */
    mockFindAll.mockResolvedValueOnce(FIRST_PAGE);

    // Second call stays pending until we resolve it.
    let resolveSecond!: (value: typeof LAST_PAGE) => void;
    const pendingSecond = new Promise<typeof LAST_PAGE>((resolve) => {
      resolveSecond = resolve;
    });
    mockFindAll.mockReturnValueOnce(pendingSecond);

    const client = makeClient();
    const { result } = renderHook(() => useUsers({}), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isFetchingNextPage).toBe(false);

    act(() => {
      result.current.fetchNextPage();
    });

    // React Query v5 uses setTimeout(0) for notifications (macrotask) which
    // can require multiple hops through notifyManager → useSyncExternalStore
    // → re-render to propagate isFetchingNextPage=true on useInfiniteQuery.
    await flushMacrotasks(5);

    expect(result.current.isFetchingNextPage).toBe(true);

    // Resolve the second page.
    await act(async () => {
      resolveSecond(LAST_PAGE);
    });

    // Flush the post-resolution notification.
    await flushMacrotasks(3);

    expect(result.current.isFetchingNextPage).toBe(false);
    expect(result.current.data?.pages).toHaveLength(2);

    client.clear();
  });

  it("hasNextPage is false when nextCursor is null", async () => {
    /*
     * When the API returns `nextCursor: null` there are no more pages —
     * hasNextPage must be false so the sentinel stops firing and the
     * "No more users" footer appears.
     */
    mockFindAll.mockResolvedValueOnce({ data: FIRST_PAGE.data, nextCursor: null });

    const client = makeClient();
    const { result } = renderHook(() => useUsers({}), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasNextPage).toBe(false);

    client.clear();
  });

  it("exposes isError and error when findAll rejects", async () => {
    /*
     * Query errors must bubble up so the table can render its error banner.
     * With retry=false the query rejects once and settles into isError=true.
     */
    const apiError = new Error("Network down");
    mockFindAll.mockRejectedValueOnce(apiError);

    const client = makeClient();
    const { result } = renderHook(() => useUsers({}), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(apiError);
    expect(result.current.data?.pages).toBeUndefined();

    client.clear();
  });

  it("uses a new query key when filters change", async () => {
    /*
     * The queryKey is `["users", filters]`. Changing a filter creates a fresh
     * query key so react-query discards the old page cache — this is what lets
     * filters reset the list back to page 1.
     */
    mockFindAll.mockResolvedValueOnce(FIRST_PAGE);
    mockFindAll.mockResolvedValueOnce(LAST_PAGE);

    const client = makeClient();
    const { result, rerender } = renderHook(
      ({ filters }) => useUsers(filters),
      {
        wrapper: makeWrapper(client),
        initialProps: { filters: { name: "alice" as string | undefined } },
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.pages).toHaveLength(1);

    // Re-render with a different filter.
    rerender({ filters: { name: "bob" } });

    await waitFor(() => expect(mockFindAll).toHaveBeenCalledTimes(2));
    // The second call uses the new name filter.
    expect(mockFindAll).toHaveBeenNthCalledWith(2, {
      name: "bob",
      role_id: undefined,
      sort: undefined,
      cursor: undefined,
      limit: PAGE_SIZE,
    });

    client.clear();
  });
});
