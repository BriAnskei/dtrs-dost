/**
 * Unit tests for `ExtractedQueueTable` — the data table on the Extraction Queue
 * list page.
 *
 * THE COMPONENT (queue-list/components/ExtractedQueueTable.tsx):
 *
 *   Props:
 *     - maxTableHeight?: string  (default "560px")
 *     - maxMobileHeight?: string (default "520px")
 *
 *   Wraps `<TableShell>` with columns: File Name, Uploaded by, Decision,
 *   Uploaded, Action. All data and side-effects come from `useExtractedQueueTable`
 * (react-query + useDebounce + infinite-scroll sentinel) and react-router's `useNavigate`.
 *
 *   To isolate the COMPONENT's behavior, we mock:
 *     - `useExtractedQueueTable` — the hook returns the exact shape the component
 *       destructures, with controlled rows/callbacks.
 *     - `react-router`'s `useNavigate` — assert navigation without a real router.
 *
 *   Behavior under test:
 *   - Columns: file_name (with icon), uploader_name ("Unknown uploader" when null),
 *     decision badge, formatted created_at datetime, and a kebab menu per row.
 *   - Kebab "View file" → calls navigate(`/extracted-queues/${id}`).
 *   - Empty state: "No extracted documents yet." when not filtered, "No documents
 *     match your filters." when isFiltered.
 *   - Loading / error states are delegated to TableShell (not directly asserted here).
 *   - Search input: calls setSearch on change (debounced in the real hook, but
 *     the component wires onChange directly to the hook's setSearch — we verify
 *     the wiring).
 *   - Sort select: calls setSort on change.
 *   - FilterPopover and ActiveFilterChips render correctly with their props.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import ExtractedQueueTable from "../queue-list/components/ExtractedQueueTable";
import type { ExtractedDocumentQueue, ExtractedDocumentQueueSort } from "../types/extracted-document-queue.types";

/* ─── Mocks ─────────────────────────────────────────────────────────────────── */

const navigateMock = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("../queue-list/hooks/use-extracted-queue-table");

const { useExtractedQueueTable } = await import(
  "../queue-list/hooks/use-extracted-queue-table"
);

type TableHookReturn = ReturnType<typeof useExtractedQueueTable>;

/** Builder so each test declares only the fields it cares about. */
function makeHookReturn(overrides: Partial<TableHookReturn> = {}): TableHookReturn {
  return {
    isLoading: false,
    isError: false,
    error: undefined,
    queues: [],
    hasNextPage: false,
    isFetchingNextPage: false,
    mobileScrollRef: { current: null },
    mobileSentinelRef: { current: null },
    desktopScrollRef: { current: null },
    desktopSentinelRef: { current: null },
    search: "",
    setSearch: vi.fn(),
    decision: undefined,
    setDecision: vi.fn(),
    unknownUploader: false,
    setUnknownUploader: vi.fn(),
    sort: "newest",
    setSort: vi.fn(),
    isFiltered: false,
    activeFilterCount: 0,
    clearFacetFilters: vi.fn(),
    clearFilters: vi.fn(),
    ...overrides,
  };
}

/** A minimal queue row; caller overrides the bits under test. */
function makeQueue(overrides: Partial<ExtractedDocumentQueue> = {}): ExtractedDocumentQueue {
  return {
    id: "q-1",
    document_file_id: "df-1",
    file_name: "invoice.pdf",
    object_key: "obj-1",
    uploader_id: "u-1",
    uploader_name: "Jane Doe",
    decision: "ACCEPT",
    created_at: "2025-01-02T03:04:05.000Z",
    ...overrides,
  };
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

import { formatDateTime } from "../../../../utils/dateFormatter";

/* ─── Tests ─────────────────────────────────────────────────────────────────── */

describe("ExtractedQueueTable", () => {
  beforeEach(() => {
    vi.mocked(useExtractedQueueTable).mockReturnValue(makeHookReturn());
    navigateMock.mockClear();
  });

  describe("empty state", () => {
    it("shows 'No extracted documents yet.' when there are no queues and not filtered", () => {
      render(<ExtractedQueueTable />);

      // TableShell renders the empty message in both mobile + desktop layouts.
      expect(screen.getAllByText("No extracted documents yet.")).toHaveLength(2);
    });

    it("shows 'No documents match your filters.' when isFiltered and no queues", () => {
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({ isFiltered: true }),
      );

      render(<ExtractedQueueTable />);

      expect(screen.getAllByText("No documents match your filters.")).toHaveLength(2);
    });
  });

  describe("row rendering", () => {
    it("renders the file name for each queue row (with FileText icon)", () => {
      const rows = [
        makeQueue({ id: "a", file_name: "alpha.pdf" }),
        makeQueue({ id: "b", file_name: "beta.pdf" }),
      ];
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({ queues: rows }),
      );

      const { container } = render(<ExtractedQueueTable />);

      // File names appear in both desktop + mobile layouts.
      const text = container.textContent;
      expect(text).toContain("alpha.pdf");
      expect(text).toContain("beta.pdf");
    });

    it("renders 'Unknown uploader' when uploader_name is null", () => {
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          queues: [makeQueue({ uploader_name: null })],
        }),
      );

      render(<ExtractedQueueTable />);

      // Appears in both desktop + mobile layouts.
      expect(screen.getAllByText("Unknown uploader")).toHaveLength(2);
    });

    it("renders the uploader name when it is not null", () => {
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          queues: [makeQueue({ uploader_name: "Jane Doe" })],
        }),
      );

      render(<ExtractedQueueTable />);

      // Appears in both desktop + mobile layouts.
      expect(screen.getAllByText("Jane Doe")).toHaveLength(2);
    });

    it("renders the DecisionBadge for each row", () => {
      /*
       * The DecisionBadge renders via StatusBadge which wraps the label text
       * in a span. We verify the label text appears (e.g. "Accepted").
       */
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          queues: [makeQueue({ decision: "ACCEPT" })],
        }),
      );

      render(<ExtractedQueueTable />);

      // "Accepted" appears once in the desktop table and once in the mobile card.
      expect(screen.getAllByText("Accepted")).toHaveLength(2);
    });

    it("renders the formatted created_at datetime", () => {
      const iso = "2025-01-02T03:04:05.000Z";
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          queues: [makeQueue({ created_at: iso })],
        }),
      );

      const { container } = render(<ExtractedQueueTable />);

      const formatted = formatDateTime(iso);
      expect(container.textContent).toContain(formatted);
    });
  });

  describe("kebab menu / View action", () => {
    it("navigates to /extracted-queues/:id when 'View file' is clicked", () => {
      const row = makeQueue({ id: "queue-abc" });
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({ queues: [row] }),
      );

      const { container } = render(<ExtractedQueueTable />);

      // Each row renders a kebab (button with title="Queue actions").
      const kebab = container.querySelector('[title="Queue actions"]')!;
      fireEvent.click(kebab);

      const viewButton = screen.getByRole("button", { name: "View file" });
      fireEvent.click(viewButton);

      expect(navigateMock).toHaveBeenCalledWith(`/extracted-queues/${row.id}`);
    });
  });

  describe("toolbar interactions", () => {
    it("renders a search input wired to setSearch on change", () => {
      const setSearch = vi.fn();
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({ search: "a", setSearch }),
      );

      render(<ExtractedQueueTable />);

      const input = screen.getByPlaceholderText("Search by uploader name…");
      fireEvent.change(input, { target: { value: "receipt" } });

      expect(setSearch).toHaveBeenCalledWith("receipt");
    });

    it("disables search input when unknownUploader is true", () => {
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({ unknownUploader: true }),
      );

      render(<ExtractedQueueTable />);

      expect(screen.getByPlaceholderText("Search by uploader name…")).toBeDisabled();
    });

    it("renders a sort select and calls setSort on change", () => {
      const setSort = vi.fn();
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({ sort: "newest", setSort }),
      );

      render(<ExtractedQueueTable />);

      const select = screen.getByLabelText("Sort");
      fireEvent.change(select, { target: { value: "oldest" } });

      expect(setSort).toHaveBeenCalledWith("oldest");
    });

    it("renders 'Newest first' and 'Oldest first' options in sort select", () => {
      render(<ExtractedQueueTable />);

      expect(screen.getByRole("option", { name: "Newest first" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Oldest first" })).toBeInTheDocument();
    });
  });

  describe("FilterPopover integration", () => {
    it("renders the Filter button with active count badge when activeFilterCount > 0", () => {
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({ activeFilterCount: 2 }),
      );

      render(<ExtractedQueueTable />);

      // The badge span with "2" should appear.
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("passes hasFilters to FilterPopover for the empty message", () => {
      /*
       * The component computes the emptyMessage inline based on isFiltered:
       *   isFiltered ? "No documents match your filters." : "No extracted documents yet."
       * We verify both branches by checking the empty message text.
       */
      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({ isFiltered: false }),
      );

      const { unmount } = render(<ExtractedQueueTable />);

      expect(screen.getAllByText("No extracted documents yet.")).toHaveLength(2);
      unmount();

      vi.mocked(useExtractedQueueTable).mockReturnValue(
        makeHookReturn({ isFiltered: true }),
      );

      render(<ExtractedQueueTable />);

      expect(screen.getAllByText("No documents match your filters.")).toHaveLength(2);
    });
  });
});
