/**
 * Unit tests for `useExtractedQueueTable` — the hook that powers the
 * ExtractedQueueTable with filtered cursor-paginted data, debounced search,
 * and infinite scroll sentinels.
 *
 * THE HOOK (queue-list/hooks/use-extracted-queue-table.ts):
 *
 *   useExtractedQueueTable()
 *     → {
 *         isLoading, isError, error, queues,
 *         hasNextPage, isFetchingNextPage,
 *         mobileScrollRef, mobileSentinelRef,
 *         desktopScrollRef, desktopSentinelRef,
 *         search, setSearch,
 *         decision, setDecision,
 *         unknownUploader, setUnknownUploader,
 *         sort, setSort,
 *         isFiltered, activeFilterCount,
 *         clearFacetFilters, clearFilters,
 *       }
 *
 * Key behaviors:
 *   - search is debounced 400ms before being forwarded to the query.
 *   - setUnknownUploader(true) clears search (since name search can never
 *     match "no uploader").
 *   - unknownUploader: false is passed as undefined to the query.
 *   - decision is passed as-is.
 *   - sort defaults to "newest"; changing it creates a new query key.
 *   - activeFilterCount = (decision ? 1 : 0) + (unknownUploader ? 1 : 0).
 *   - isFiltered = search non-empty OR decision set OR unknownUploader OR sort !== default.
 *   - clearFacetFilters resets only decision + unknownUploader.
 *   - clearFilters resets everything including search + sort.
 *   - queues = flattened pages from the infinite query.
 *   - The query key is ["extracted-document-queues", filters].
 *
 * We mock `useExtractedDocumentQueues` (the react-query wrapper) so we control
 * the API responses without network calls.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useExtractedQueueTable } from "../queue-list/hooks/use-extracted-queue-table";

const { mockUseExtractedDocumentQueues } = vi.hoisted(() => ({
  mockUseExtractedDocumentQueues: vi.fn(),
}));

vi.mock("../queue-list/hooks/api/use-extracted-queue", () => ({
  useExtractedDocumentQueues: mockUseExtractedDocumentQueues,
}));

vi.mock("use-debounce", () => ({
  useDebounce: <T,>(value: T, _delay: number): [T] => [value],
}));

/* ─── Fixtures ─────────────────────────────────────────────────────────────── */

const PAGE1 = {
  data: [
    {
      id: "q-1",
      document_file_id: "df-1",
      file_name: "invoice.pdf",
      object_key: "obj-1",
      uploader_id: "u-1",
      uploader_name: "Jane Doe",
      decision: "ACCEPT" as const,
      created_at: "2025-01-02T03:04:05.000Z",
    },
  ],
  nextCursor: "cursor-2",
};

const PAGE2 = {
  data: [
    {
      id: "q-2",
      document_file_id: "df-2",
      file_name: "receipt.pdf",
      object_key: "obj-2",
      uploader_id: null,
      uploader_name: null,
      decision: "REVIEW" as const,
      created_at: "2025-01-03T03:04:05.000Z",
    },
  ],
  nextCursor: null,
};

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

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
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    );
  };
}

/**
 * The mock returns a react-query result object. We control all fields.
 */
function mockQueryResult(overrides: Record<string, unknown> = {}) {
  const defaults = {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
  return { ...defaults, ...overrides };
}

/* ─── Tests ─────────────────────────────────────────────────────────────────── */

describe("useExtractedQueueTable", () => {
  afterEach(() => {
    mockUseExtractedDocumentQueues.mockReset();
  });

  describe("initial state", () => {
    it("starts with default filters: search='', decision undefined, unknownUploader false, sort='newest'", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.search).toBe("");
      expect(result.current.decision).toBeUndefined();
      expect(result.current.unknownUploader).toBe(false);
      expect(result.current.sort).toBe("newest");

      client.clear();
    });

    it("forwards default filters to useExtractedDocumentQueues", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      renderHook(() => useExtractedQueueTable(), { wrapper: makeWrapper(client) });

      expect(mockUseExtractedDocumentQueues).toHaveBeenCalledWith({
        uploader_name: undefined,
        unknown_uploader: undefined,
        decision: undefined,
        sort: "newest",
      });

      client.clear();
    });
  });

  describe("queues flattening", () => {
    it("flattens pages into a single array of queues", async () => {
      mockUseExtractedDocumentQueues.mockReturnValue(
        mockQueryResult({
          data: { pages: [PAGE1, PAGE2] },
          hasNextPage: false,
        }),
      );

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.queues).toHaveLength(2);
      expect(result.current.queues[0].id).toBe("q-1");
      expect(result.current.queues[1].id).toBe("q-2");

      client.clear();
    });

    it("returns empty array when no data", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.queues).toEqual([]);

      client.clear();
    });

    it("returns empty array when data.pages is empty", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(
        mockQueryResult({ data: { pages: [] } }),
      );

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.queues).toEqual([]);

      client.clear();
    });
  });

  describe("isFiltered", () => {
    it("is false when no filters are set", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.isFiltered).toBe(false);

      client.clear();
    });

    it("is true when search is non-empty", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setSearch("jane"));

      expect(result.current.isFiltered).toBe(true);

      client.clear();
    });

    it("is true when decision is set", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setDecision("ACCEPT"));

      expect(result.current.isFiltered).toBe(true);

      client.clear();
    });

    it("is true when unknownUploader is true", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setUnknownUploader(true));

      expect(result.current.isFiltered).toBe(true);

      client.clear();
    });

    it("is true when sort is not 'newest'", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setSort("oldest"));

      expect(result.current.isFiltered).toBe(true);

      client.clear();
    });
  });

  describe("activeFilterCount", () => {
    it("is 0 when no facet filters are active", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.activeFilterCount).toBe(0);

      client.clear();
    });

    it("counts decision as 1", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setDecision("REVIEW"));

      expect(result.current.activeFilterCount).toBe(1);

      client.clear();
    });

    it("counts unknownUploader as 1", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setUnknownUploader(true));

      expect(result.current.activeFilterCount).toBe(1);

      client.clear();
    });

    it("counts both decision and unknownUploader as 2", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setDecision("INVALID"));
      act(() => result.current.setUnknownUploader(true));

      expect(result.current.activeFilterCount).toBe(2);

      client.clear();
    });

    it("does NOT count search or sort in activeFilterCount", () => {
      /*
       * activeFilterCount only counts decision + unknownUploader. Search and
       * sort are visible filter controls but don't contribute to the badge.
       */
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setSearch("jane"));
      act(() => result.current.setSort("oldest"));

      expect(result.current.activeFilterCount).toBe(0);

      client.clear();
    });
  });

  describe("setUnknownUploader", () => {
    it("clears search when setting unknownUploader to true", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setSearch("some search"));
      expect(result.current.search).toBe("some search");

      act(() => result.current.setUnknownUploader(true));

      expect(result.current.search).toBe("");
      expect(result.current.unknownUploader).toBe(true);

      client.clear();
    });

    it("does NOT clear search when setting unknownUploader to false", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setSearch("some search"));
      act(() => result.current.setUnknownUploader(false));

      expect(result.current.search).toBe("some search");
      expect(result.current.unknownUploader).toBe(false);

      client.clear();
    });
  });

  describe("clearFacetFilters", () => {
    it("resets decision and unknownUploader but leaves search and sort intact", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setSearch("jane"));
      act(() => result.current.setDecision("ACCEPT"));
      act(() => result.current.setSort("oldest"));
      // Set unknownUploader last — it clears search as a side effect, so set
      // search again afterward to verify clearFacetFilters leaves it alone.
      act(() => result.current.setUnknownUploader(true));
      act(() => result.current.setSearch("jane"));

      act(() => result.current.clearFacetFilters());

      expect(result.current.decision).toBeUndefined();
      expect(result.current.unknownUploader).toBe(false);
      expect(result.current.search).toBe("jane"); // NOT cleared
      expect(result.current.sort).toBe("oldest"); // NOT cleared

      client.clear();
    });
  });

  describe("clearFilters", () => {
    it("resets search, decision, unknownUploader, and sort to defaults", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setSearch("jane"));
      act(() => result.current.setDecision("ACCEPT"));
      act(() => result.current.setUnknownUploader(true));
      act(() => result.current.setSort("oldest"));

      act(() => result.current.clearFilters());

      expect(result.current.search).toBe("");
      expect(result.current.decision).toBeUndefined();
      expect(result.current.unknownUploader).toBe(false);
      expect(result.current.sort).toBe("newest");
      expect(result.current.isFiltered).toBe(false);

      client.clear();
    });
  });

  describe("infinite scroll", () => {
    it("exposes refs from two useInfiniteScrollSentinel calls", () => {
      mockUseExtractedDocumentQueues.mockReturnValue(mockQueryResult());

      const client = makeClient();
      const { result } = renderHook(() => useExtractedQueueTable(), {
        wrapper: makeWrapper(client),
      });

      // Both mobile and desktop sentinels should have rootRef + sentinelRef.
      expect(result.current.mobileScrollRef).toEqual({ current: null });
      expect(result.current.mobileSentinelRef).toEqual({ current: null });
      expect(result.current.desktopScrollRef).toEqual({ current: null });
      expect(result.current.desktopSentinelRef).toEqual({ current: null });

      client.clear();
    });
  });
});
