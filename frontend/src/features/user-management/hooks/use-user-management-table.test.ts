/**
 * Tests for `useUserManagementTable` — the orchestration hook that ties together
 * debounced search, role/sort filters, infinite scroll, and modal state for the
 * user-management table.
 *
 * WHY THIS HOOK MATTERS:
 *   It is the glue layer: it calls `useUsers` with the right filter params,
 *   debounces the search box (400ms), decides whether "Load more" should fire
 *   (hasNextPage && !isFetchingNextPage), and exposes modal open/close state
 *   for Add/Edit/Deactivate/ResetPassword modals.
 *
 * WHAT WE MOCK:
 *   - `./use-users` — fully mocked so we control isLoading, hasNextPage,
 *     fetchNextPage, etc. without hitting a server or needing a QueryClient.
 *   - `../../../hooks/user-infinite-scroll-sentinel` — mocked because
 *     happy-dom has no IntersectionObserver.
 *
 * `useDebounce` from `use-debounce` is NOT mocked — it uses real `setTimeout`,
 * so we use fake timers (`vi.useFakeTimers`) and advance them 400ms.
 *
 * `mapUsersResponseToSystemUsers` is NOT mocked — pure function, safe to use.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserManagementTable } from "./use-user-management-table";

const { mockUseUsers, mockUseInfiniteScrollSentinel, mockFetchNextPage } =
  vi.hoisted(() => ({
    mockUseUsers: vi.fn(),
    mockFetchNextPage: vi.fn(),
    mockUseInfiniteScrollSentinel: vi.fn(),
  }));

vi.mock("./use-users", () => ({
  useUsers: mockUseUsers,
}));

vi.mock("../../../hooks/user-infinite-scroll-sentinel", () => ({
  useInfiniteScrollSentinel: mockUseInfiniteScrollSentinel,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A sample API user as returned by the backend. */
const USER_RESPONSE_A = {
  id: "u-1",
  full_name: "Alice Reyes",
  position: "Engineer",
  email: "alice@example.gov.ph",
  division_name: "NCR",
  role: "admin",
  contact: "0917-123-4567",
  created_at: "2025-01-15T00:00:00Z",
};

const USER_RESPONSE_B = {
  id: "u-2",
  full_name: "Bob Santos",
  position: "Receiver",
  email: "bob@example.gov.ph",
  division_name: undefined,
  role: "receiver_officer",
  contact: "0918-987-6543",
  created_at: "2025-02-20T00:00:00Z",
};

/** The mock `data` that `useInfiniteQuery` returns on success. */
const MOCK_DATA = {
  pages: [{ data: [USER_RESPONSE_A, USER_RESPONSE_B], nextCursor: null }],
  pageParams: [undefined],
};

/**
 * Build a configurable mock return value for `useUsers`.
 * Tests can override specific fields after the spread.
 */
function mockUseUsersReturn(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: mockFetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  };
}

/**
 * Advance the 400ms `useDebounce` timer.
 * Must be wrapped in `act` so React flushes the re-render that the
 * debounced value change triggers.
 */
async function flushDebounce(ms = 400) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useUserManagementTable", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseUsers.mockReset();
    mockFetchNextPage.mockClear();
    mockUseUsers.mockReturnValue(mockUseUsersReturn());
    mockUseInfiniteScrollSentinel.mockReset();
    mockUseInfiniteScrollSentinel.mockReturnValue({
      rootRef: { current: null },
      sentinelRef: { current: null },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts with empty search, role 'All', sort 'newest'", () => {
      /*
       * Defaults: search="", filterRole="All", sort="newest" → no filters active.
       * isLoading and isError come straight from the mocked useUsers return.
       */
      const { result } = renderHook(() => useUserManagementTable());

      expect(result.current.search).toBe("");
      expect(result.current.filterRole).toBe("All");
      expect(result.current.sort).toBe("newest");
      expect(result.current.hasFilters).toBe(false);
    });

    it("no modals are open and no targets are selected initially", () => {
      const { result } = renderHook(() => useUserManagementTable());

      expect(result.current.addModal).toBe(false);
      expect(result.current.editTarget).toBeNull();
      expect(result.current.deactivateTarget).toBeNull();
      expect(result.current.resetTarget).toBeNull();
    });

    it("passes default filters to useUsers on first render", () => {
      /*
       * The debounced search starts as "" which becomes undefined in the
       * filter object ("" || undefined === undefined). role_id is undefined
       * for "All". sort defaults to "newest".
       */
      renderHook(() => useUserManagementTable());

      expect(mockUseUsers).toHaveBeenCalledWith({
        name: undefined,
        role_id: undefined,
        sort: "newest",
      });
    });

    it("reflects isLoading / isError / error from useUsers", () => {
      mockUseUsers.mockReturnValue(
        mockUseUsersReturn({
          isLoading: true,
          isError: true,
          error: new Error("boom"),
        }),
      );

      const { result } = renderHook(() => useUserManagementTable());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("search (debounced)", () => {
    it("updates useUsers name filter after 400ms debounce", async () => {
      /*
       * Typing in the search box: setSearch("john") → useDebounce schedules a
       * 400ms timeout → after advancing, useUsers is called with name="john".
       * Immediately after setSearch (before the debounce fires), useUsers
       * should NOT have been called with the new name yet.
       */
      const { result } = renderHook(() => useUserManagementTable());

      act(() => {
        result.current.setSearch("john");
      });

      // UseUsers may have been called again due to the re-render from setSearch,
      // but the debounced value hasn't changed yet — the last call should still
      // have name: undefined (NOT "john").
      const callsAfterSetSearch = mockUseUsers.mock.calls;
      const lastCallBeforeDebounce = callsAfterSetSearch[callsAfterSetSearch.length - 1];
      expect(lastCallBeforeDebounce[0].name).toBeUndefined();

      await flushDebounce();

      // With fake timers, waitFor's internal polling doesn't fire —
      // assert directly after the debounce flush.
      expect(mockUseUsers).toHaveBeenLastCalledWith({
        name: "john",
        role_id: undefined,
        sort: "newest",
      });
    });

    it("does NOT call useUsers with the new search value before the 400ms timer", () => {
      /*
       * Verify the debounce: setSearch followed by only 399ms should not have
       * triggered the debounced re-call.
       */
      const { result } = renderHook(() => useUserManagementTable());

      act(() => result.current.setSearch("jane"));
      act(() => {
        vi.advanceTimersByTime(399);
      });

      // The last call should still have the initial params (debounced value unchanged).
      expect(mockUseUsers).toHaveBeenLastCalledWith({
        name: undefined,
        role_id: undefined,
        sort: "newest",
      });
    });
  });

  describe("filterRole", () => {
    it("translates 'Admin' filter to role_id=2 via ROLE_ID_MAP", async () => {
      /*
       * Setting filterRole="Admin" maps to ROLE_ID_MAP.Admin === 2. The
       * debounced search is still "" (→ undefined), so useUsers gets {name: undefined, role_id: 2, sort: "newest"}.
       */
      const { result } = renderHook(() => useUserManagementTable());

      await act(async () => {
        result.current.setFilterRole("Admin");
      });

      expect(mockUseUsers).toHaveBeenLastCalledWith({
        name: undefined,
        role_id: 2,
        sort: "newest",
      });
    });

    it("translates 'Receiver' filter to role_id=3", async () => {
      const { result } = renderHook(() => useUserManagementTable());

      await act(async () => {
        result.current.setFilterRole("Receiver");
      });

      expect(mockUseUsers).toHaveBeenLastCalledWith({
        name: undefined,
        role_id: 3,
        sort: "newest",
      });
    });

    it("translates 'Division' filter to role_id=4", async () => {
      const { result } = renderHook(() => useUserManagementTable());

      await act(async () => {
        result.current.setFilterRole("Division");
      });

      expect(mockUseUsers).toHaveBeenLastCalledWith({
        name: undefined,
        role_id: 4,
        sort: "newest",
      });
    });
  });

  describe("sort", () => {
    it("toggleSort switches from 'newest' to 'oldest'", async () => {
      /*
       * First call: sort="newest" (default). toggleSort → sort="oldest".
       * useUsers is called again with sort="oldest".
       */
      const { result } = renderHook(() => useUserManagementTable());

      await act(async () => {
        result.current.toggleSort();
      });

      expect(result.current.sort).toBe("oldest");
      expect(mockUseUsers).toHaveBeenLastCalledWith({
        name: undefined,
        role_id: undefined,
        sort: "oldest",
      });
    });

    it("toggleSort switches back to 'newest' after two toggles", async () => {
      const { result } = renderHook(() => useUserManagementTable());

      await act(async () => result.current.toggleSort());
      await act(async () => result.current.toggleSort());

      expect(result.current.sort).toBe("newest");
    });
  });

  describe("clearFilters", () => {
    it("resets search, role, and sort to defaults", async () => {
      /*
       * Apply a search + role + sort-change, then clearFilters. After the
       * debounce fires, useUsers should be called with clean params.
       */
      const { result } = renderHook(() => useUserManagementTable());

      await act(async () => {
        result.current.setSearch("alice");
        result.current.setFilterRole("Admin");
        result.current.toggleSort();
      });

      // Flush the search debounce so the state is settled.
      await flushDebounce();

      expect(result.current.search).toBe("alice");
      expect(result.current.filterRole).toBe("Admin");
      expect(result.current.sort).toBe("oldest");
      expect(result.current.hasFilters).toBe(true);

      await act(async () => {
        result.current.clearFilters();
      });

      // clearFilters is synchronous (setSearch("")). The debounced value
      // hasn't updated yet, so we still see hasFilters=true immediately.
      // After the debounce fires, hasFilters becomes false.
      await flushDebounce();

      expect(result.current.search).toBe("");
      expect(result.current.filterRole).toBe("All");
      expect(result.current.sort).toBe("newest");
      expect(result.current.hasFilters).toBe(false);

      expect(mockUseUsers).toHaveBeenLastCalledWith({
        name: undefined,
        role_id: undefined,
        sort: "newest",
      });
    });
  });

  describe("hasFilters", () => {
    it("is true when only search is set", async () => {
      const { result } = renderHook(() => useUserManagementTable());

      await act(async () => result.current.setSearch("x"));

      // hasFilters checks the raw `search` state, not the debounced value.
      expect(result.current.hasFilters).toBe(true);
    });

    it("is true when only filterRole is set", async () => {
      const { result } = renderHook(() => useUserManagementTable());

      await act(async () => result.current.setFilterRole("Receiver"));

      expect(result.current.hasFilters).toBe(true);
    });

    it("is true when only sort is toggled", async () => {
      const { result } = renderHook(() => useUserManagementTable());

      await act(async () => result.current.toggleSort());

      expect(result.current.hasFilters).toBe(true);
    });

    it("is false when all are at defaults", () => {
      const { result } = renderHook(() => useUserManagementTable());
      expect(result.current.hasFilters).toBe(false);
    });
  });

  describe("loadMore (via sentinel onIntersect)", () => {
    /*
     * `loadMore` is not returned directly — it's wired into the scroll sentinel
     * hooks as the `onIntersect` callback. We extract it from the mocked
     * `useInfiniteScrollSentinel` calls and invoke it to verify the guard logic:
     *
     *   if (hasNextPage && !isFetchingNextPage) fetchNextPage();
     */
    it("calls fetchNextPage when hasNextPage=true and not already fetching", () => {
      mockFetchNextPage.mockClear();
      mockUseUsers.mockReturnValue(
        mockUseUsersReturn({ hasNextPage: true, isFetchingNextPage: false }),
      );

      renderHook(() => useUserManagementTable());

      // Two sentinel calls: mobile + desktop. Both use the same loadMore.
      const onIntersect = mockUseInfiniteScrollSentinel.mock.calls[0][0].onIntersect;
      act(() => {
        onIntersect();
      });

      expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
    });

    it("does NOT call fetchNextPage when hasNextPage=false", () => {
      /*
       * No more pages → nothing to load. The "No more users" message renders.
       */
      mockFetchNextPage.mockClear();
      mockUseUsers.mockReturnValue(
        mockUseUsersReturn({ hasNextPage: false, isFetchingNextPage: false }),
      );

      renderHook(() => useUserManagementTable());

      const onIntersect = mockUseInfiniteScrollSentinel.mock.calls[0][0].onIntersect;
      act(() => {
        onIntersect();
      });

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it("does NOT call fetchNextPage when isFetchingNextPage=true", () => {
      /*
       * Already loading the next page → don't fire another request.
       * The TableShell shows "Loading more…" text.
       */
      mockFetchNextPage.mockClear();
      mockUseUsers.mockReturnValue(
        mockUseUsersReturn({ hasNextPage: true, isFetchingNextPage: true }),
      );

      renderHook(() => useUserManagementTable());

      const onIntersect = mockUseInfiniteScrollSentinel.mock.calls[0][0].onIntersect;
      act(() => {
        onIntersect();
      });

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });
  });

  describe("filtered (mapped users)", () => {
    it("maps data.pages to SystemUser view-models via mapUsersResponseToSystemUsers", () => {
      /*
       * When useUsers returns paginated data, `filtered` should contain the
       * flattened + mapped SystemUser[] array. The real mapper handles role
       * translation and date formatting.
       */
      mockUseUsers.mockReturnValue(
        mockUseUsersReturn({ data: MOCK_DATA }),
      );

      const { result } = renderHook(() => useUserManagementTable());

      expect(result.current.filtered).toHaveLength(2);
      expect(result.current.filtered[0].id).toBe("u-1");
      expect(result.current.filtered[0].name).toBe("Alice Reyes");
      expect(result.current.filtered[0].role).toBe("Admin"); // mapped from "admin"
      expect(result.current.filtered[1].id).toBe("u-2");
      expect(result.current.filtered[1].role).toBe("Receiver"); // mapped from "receiver_officer"
    });

    it("returns an empty array when data is undefined", () => {
      const { result } = renderHook(() => useUserManagementTable());
      expect(result.current.filtered).toEqual([]);
    });

    it("flattens multiple pages", () => {
      /*
       * Paginated data has multiple pages; `filtered` should be the flattened
       * concatenation of all pages' mapped users.
       */
      mockUseUsers.mockReturnValue(
        mockUseUsersReturn({
          data: {
            pages: [
              { data: [USER_RESPONSE_A], nextCursor: "cursor-1" },
              { data: [USER_RESPONSE_B], nextCursor: null },
            ],
            pageParams: [undefined, "cursor-1"],
          },
        }),
      );

      const { result } = renderHook(() => useUserManagementTable());

      expect(result.current.filtered).toHaveLength(2);
      expect(result.current.filtered.map((u) => u.id)).toEqual(["u-1", "u-2"]);
    });
  });

  describe("toFormState", () => {
    it("maps a SystemUser into UserFormState, stripping hyphens from contact", () => {
      /*
       * toFormState converts the view-model SystemUser into the form-friendly
       * shape used by AddUserModal and EditUserModal. The contact number has
       * hyphens removed (removeHyphens) for the input field.
       */
      const { result } = renderHook(() => useUserManagementTable());

      const systemUser = result.current.filtered.length
        ? result.current.filtered[0]
        : {
            id: "u-1",
            name: "Alice Reyes",
            position: "Engineer",
            divisionName: "NCR",
            role: "Admin" as const,
            email: "alice@example.gov.ph",
            contact: "0917-123-4567",
            createtAt: "Jan 2025",
          };

      const formState = result.current.toFormState(systemUser);

      expect(formState.name).toBe("Alice Reyes");
      expect(formState.position).toBe("Engineer");
      expect(formState.role).toBe("Admin");
      expect(formState.email).toBe("alice@example.gov.ph");
      expect(formState.contact).toBe("09171234567"); // hyphens removed
      expect(formState.division).toBe("NCR");
      expect(formState.password).toBe("");
    });

    it("handles missing divisionName gracefully", () => {
      const { result } = renderHook(() => useUserManagementTable());

      const formState = result.current.toFormState({
        id: "u-2",
        name: "Bob Santos",
        position: "Receiver",
        role: "Receiver",
        email: "bob@example.gov.ph",
        contact: "0918-987-6543",
        createtAt: "Feb 2025",
      });

      expect(formState.division).toBeUndefined();
      expect(formState.contact).toBe("09189876543");
    });
  });

  describe("modal state setters", () => {
    it("toggleAddModal opens and closes the Add User modal", () => {
      const { result } = renderHook(() => useUserManagementTable());

      expect(result.current.addModal).toBe(false);
      act(() => result.current.setAddModal(true));
      expect(result.current.addModal).toBe(true);
      act(() => result.current.setAddModal(false));
      expect(result.current.addModal).toBe(false);
    });

    it("setEditTarget stores the user to edit", () => {
      const { result } = renderHook(() => useUserManagementTable());

      const target = {
        id: "u-1",
        name: "Alice",
        position: "Engineer",
        role: "Admin" as const,
        email: "a@b.c",
        contact: "0917-123-4567",
        createtAt: "Jan 2025",
      };

      act(() => result.current.setEditTarget(target));
      expect(result.current.editTarget).toEqual(target);
    });

    it("setDeactivateTarget stores the user to deactivate", () => {
      const { result } = renderHook(() => useUserManagementTable());

      const user = {
        id: "u-3",
        name: "Charlie",
        position: "Engineer",
        role: "Receiver" as const,
        email: "c@d.e",
        contact: "0919-123-4567",
        createtAt: "Mar 2025",
      };

      act(() => result.current.setDeactivateTarget(user));
      expect(result.current.deactivateTarget).toEqual(user);
    });

    it("setResetTarget stores the user whose password is being reset", () => {
      /*
       * resetTarget is kept separate from editTarget because it enters a
       * different modal with its own multi-step verify/method/direct/link flow.
       */
      const { result } = renderHook(() => useUserManagementTable());

      const user = {
        id: "u-4",
        name: "Dana",
        position: "Manager",
        role: "Admin" as const,
        email: "d@e.f",
        contact: "0920-123-4567",
        createtAt: "Apr 2025",
      };

      act(() => result.current.setResetTarget(user));
      expect(result.current.resetTarget).toEqual(user);
    });

    it("setEditTarget(null) clears the edit target", () => {
      const { result } = renderHook(() => useUserManagementTable());

      act(() => result.current.setEditTarget({ id: "u-1", name: "A", position: "", role: "Admin", email: "", contact: "", createtAt: "" }));
      expect(result.current.editTarget).not.toBeNull();

      act(() => result.current.setEditTarget(null));
      expect(result.current.editTarget).toBeNull();
    });
  });

  describe("returns scroll sentinel refs", () => {
    /*
     * The hook wires two IntersectionObserver sentinels (mobile + desktop scroll
     * containers) into the mocked useInfiniteScrollSentinel. We assert the refs
     * are forwarded so the component can attach them to the DOM.
     */
    it("exposes mobileScrollRef, mobileSentinelRef, desktopScrollRef, desktopSentinelRef", () => {
      const { result } = renderHook(() => useUserManagementTable());

      expect(result.current.mobileScrollRef).toEqual({ current: null });
      expect(result.current.mobileSentinelRef).toEqual({ current: null });
      expect(result.current.desktopScrollRef).toEqual({ current: null });
      expect(result.current.desktopSentinelRef).toEqual({ current: null });
    });

    it("passes onIntersect callback and enabled flag to the sentinel hook", () => {
      const { result } = renderHook(() => useUserManagementTable());

      // Two calls: mobile + desktop. Both get loadMore + hasNextPage as enabled.
      expect(mockUseInfiniteScrollSentinel).toHaveBeenCalledTimes(2);
      // The onIntersect should be a function that calls fetchNextPage.
      const mobileCall = mockUseInfiniteScrollSentinel.mock.calls[0][0];
      expect(typeof mobileCall.onIntersect).toBe("function");
      expect(mobileCall.enabled).toBe(false); // hasNextPage is false by default
    });
  });
});
