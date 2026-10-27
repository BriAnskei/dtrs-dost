/**
 * Unit tests for `MyUploadedDocumentsTable` — the list page for documents the
 * current receiver has uploaded, surfaced from the extracted-document queue.
 *
 * THE COMPONENT (list-components/MyUploadedDocumentsTable.tsx):
 *
 *   Renders `<TableShell>` plus `<DeleteQueueModal>`. All data and side-effects
 *   come from the `useMyExtractedQueueTable` hook (react-query + sonner) and
 *   react-router's `useNavigate`. To test the COMPONENT's behavior in isolation,
 *   both are mocked:
 *
 *     - `useMyExtractedQueueTable` is mocked so the table receives controlled
 *       rows / state / callbacks.
 *     - `react-router`'s `useNavigate` is mocked so we can assert where "View"
 *       navigates and with what router-state, without a real router.
 *     - `sonner`'s `toast` is mocked (the delete flow triggers toasts via the
 *       underlying mutation inside `useDeleteExtractedDocumentQueue`).
 *
 * THE COMPONENT UNDER TEST:
 *
 *   Props:
 *     - maxTableHeight?: string  (default "560px")
 *     - maxMobileHeight?: string (default "520px")
 *
 *   Behavior:
 *     - For each queue row renders: file name, decision badge, status badge,
 *       uploaded-at datetime (via formatDateTime), and a kebab menu.
 *     - Kebab "View" → calls navigate(`/my-uploads/${id}`, { state: { item } }).
 *     - Kebab "Delete" → calls `deleteModal.open(item)`, which opens the
 *       `<DeleteQueueModal>` with that item.
 *     - Toolbar search field → calls setSearch on change.
 *     - Decision filter select → calls setFilterDecision.
 *     - Status filter select → calls setFilterStatus.
 *     - Sort toggle button → calls toggleSort; button label reflects sort.
 *     - "Clear" button only renders when hasFilters; clicking calls clearFilters.
 *     - Loading state → TableShell shows skeletons (aria-busy region).
 *     - Error state → TableShell shows "Failed to load documents".
 *     - Empty (no rows) → TableShell shows the emptyMessage.
 *
 * ─── MOCKING STRATEGY ─────────────────────────────────────────────────────────
 *
 *   The hook returns the exact shape the component destructures, so we control
 *   every branch of the component without touching react-query/axios/network.
 *   The DeleteQueueModal is rendered for real (its props — item, isDeleting,
 *   onClose, onConfirm — come from the mocked hook), so clicking "Delete" end
 *   to end exercises the modal's destructive copy for each status.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import MyUploadedDocumentsTable from "../list-components/MyUploadedDocumentsTable";
import type {
  ExtractedDocumentQueueStatus,
  MyExtractedDocumentQueue,
} from "../types/extracted-queue-receiver-types";

/* ─── Mocks ─────────────────────────────────────────────────────────────────── */

const navigateMock = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("../hooks/use-my-extracted-queue-table");

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type TableHookReturn = ReturnType<typeof import("../hooks/use-my-extracted-queue-table").useMyExtractedQueueTable>;

/** Builder so each test can declare only the fields it cares about. */
function makeHookReturn(overrides: Partial<TableHookReturn> = {}): TableHookReturn {
  return {
    isLoading: false,
    isError: false,
    error: undefined,
    items: [],
    hasFilters: false,
    clearFilters: vi.fn(),
    search: "",
    setSearch: vi.fn(),
    filterDecision: "All",
    setFilterDecision: vi.fn(),
    filterStatus: "All",
    setFilterStatus: vi.fn(),
    sort: "newest",
    toggleSort: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    mobileScrollRef: { current: null },
    mobileSentinelRef: { current: null },
    desktopScrollRef: { current: null },
    desktopSentinelRef: { current: null },
    deleteModal: {
      target: null,
      isOpen: false,
      isDeleting: false,
      open: vi.fn(),
      close: vi.fn(),
      confirm: vi.fn(),
    },
    ...overrides,
  };
}

/** A minimal queue row; caller overrides the bits under test. */
function makeRow(overrides: Partial<MyExtractedDocumentQueue> = {}): MyExtractedDocumentQueue {
  return {
    id: "queue-1",
    file_name: "invoice.pdf",
    decision: "ACCEPT",
    status: "PENDING",
    created_at: "2025-01-02T03:04:05.000Z",
    fields: [],
    ...overrides,
  };
}

/* ─── Fixtures ─────────────────────────────────────────────────────────────── */

const { useMyExtractedQueueTable } = await import("../hooks/use-my-extracted-queue-table");

/* ─── Tests ─────────────────────────────────────────────────────────────────── */

describe("MyUploadedDocumentsTable", () => {
  beforeEach(() => {
    vi.mocked(useMyExtractedQueueTable).mockReturnValue(makeHookReturn());
    navigateMock.mockClear();
  });

  describe("loading state", () => {
    it("renders skeletons while isLoading (aria-busy=true on skeleton spans)", () => {
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(makeHookReturn({ isLoading: true }));

      const { container } = render(<MyUploadedDocumentsTable />);

      // react-loading-skeleton marks its spans with aria-busy="true".
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    });

    it("renders nothing for rows while isLoading", () => {
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({ isLoading: true, items: [makeRow()] }),
      );

      render(<MyUploadedDocumentsTable />);

      expect(screen.queryByText("invoice.pdf")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders the error message from TableShell", () => {
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({ isError: true, error: new Error("Network down") }),
      );

      render(<MyUploadedDocumentsTable />);

      expect(screen.getByText(/Failed to load documents: Network down/)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows the no-filters empty message when there are no items", () => {
      render(<MyUploadedDocumentsTable />);

      // TableShell renders the empty cell in both desktop + mobile layouts.
      expect(screen.getAllByText("You haven't uploaded any documents yet.")[0]).toBeInTheDocument();
    });

    it("shows the filtered empty message when hasFilters is true", () => {
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({ hasFilters: true, items: [] }),
      );

      render(<MyUploadedDocumentsTable />);

      expect(
        screen.getAllByText("No uploaded documents match your filters.")[0],
      ).toBeInTheDocument();
    });
  });

  describe("row rendering", () => {
    it("renders the file name for each queue row", () => {
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          items: [makeRow({ id: "a", file_name: "alpha.pdf" }), makeRow({ id: "b", file_name: "beta.pdf" })],
        }),
      );

      const { container } = render(<MyUploadedDocumentsTable />);

      // File name appears once per row in each of the two TableShell layouts
      // (desktop table + mobile card), so query within the container.
      const alpha = container.textContent;
      expect(alpha).toContain("alpha.pdf");
      expect(alpha).toContain("beta.pdf");
    });

    it("renders the uploaded-at datetime via formatDateTime", () => {
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({ items: [makeRow({ created_at: "2025-01-02T03:04:05.000Z" })] }),
      );

      const { container } = render(<MyUploadedDocumentsTable />);

      // formatDateTime uses the browser locale; assert the formatted string appears.
      const formatted = new Date("2025-01-02T03:04:05.000Z").toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      expect(container.textContent).toContain(formatted);
    });
  });

  describe("toolbar interactions", () => {
    it("renders a search input wired to setSearch on change", () => {
      const setSearch = vi.fn();
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(makeHookReturn({ search: "a", setSearch }));

      render(<MyUploadedDocumentsTable />);

      const input = screen.getByPlaceholderText("Search file name...");
      fireEvent.change(input, { target: { value: "receipt" } });

      expect(setSearch).toHaveBeenCalledWith("receipt");
    });

    it("renders the decision filter select and calls setFilterDecision on change", () => {
      const setFilterDecision = vi.fn();
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({ filterDecision: "All", setFilterDecision }),
      );

      render(<MyUploadedDocumentsTable />);

      const select = screen.getByLabelText("Filter by decision");
      fireEvent.change(select, { target: { value: "INVALID" } });

      expect(setFilterDecision).toHaveBeenCalledWith("INVALID");
    });

    it("renders the status filter select and calls setFilterStatus on change", () => {
      const setFilterStatus = vi.fn();
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({ filterStatus: "All", setFilterStatus }),
      );

      render(<MyUploadedDocumentsTable />);

      const select = screen.getByLabelText("Filter by status");
      fireEvent.change(select, { target: { value: "APPROVED" } });

      expect(setFilterStatus).toHaveBeenCalledWith("APPROVED");
    });

    it("renders the sort toggle button showing 'Newest' when sort='newest'", () => {
      render(<MyUploadedDocumentsTable />);

      // The button's accessible name is its text content ("Newest"); its title holds
      // the tooltip "Newest first".
      expect(screen.getByRole("button", { name: "Newest" })).toBeInTheDocument();
      expect(screen.getByTitle("Newest first")).toBeInTheDocument();
    });

    it("renders the sort toggle button showing 'Oldest' when sort='oldest'", () => {
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(makeHookReturn({ sort: "oldest" }));

      render(<MyUploadedDocumentsTable />);

      expect(screen.getByRole("button", { name: "Oldest" })).toBeInTheDocument();
      expect(screen.getByTitle("Oldest first")).toBeInTheDocument();
    });

    it("calls toggleSort when the sort button is clicked", () => {
      const toggleSort = vi.fn();
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(makeHookReturn({ sort: "newest", toggleSort }));

      render(<MyUploadedDocumentsTable />);

      fireEvent.click(screen.getByRole("button", { name: "Newest" }));

      expect(toggleSort).toHaveBeenCalled();
    });

    describe("clear filters", () => {
      it("renders a Clear button only when hasFilters is true", () => {
        vi.mocked(useMyExtractedQueueTable).mockReturnValue(makeHookReturn({ hasFilters: true }));

        render(<MyUploadedDocumentsTable />);

        expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
      });

      it("does NOT render a Clear button when hasFilters is false", () => {
        render(<MyUploadedDocumentsTable />);

        expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
      });

      it("calls clearFilters when Clear is clicked", () => {
        const clearFilters = vi.fn();
        vi.mocked(useMyExtractedQueueTable).mockReturnValue(
          makeHookReturn({ hasFilters: true, clearFilters }),
        );

        render(<MyUploadedDocumentsTable />);

        fireEvent.click(screen.getByRole("button", { name: "Clear" }));

        expect(clearFilters).toHaveBeenCalled();
      });
    });
  });

  describe("row actions", () => {
    it("navigates to the details route with router state when 'View' is clicked", () => {
      const row = makeRow({ id: "queue-abc", file_name: "invoice.pdf" });
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(makeHookReturn({ items: [row] }));

      const { container } = render(<MyUploadedDocumentsTable />);

      // Each row renders a kebab in both desktop + mobile layouts; target the
      // first one (desktop header row).
      const kebab = container.querySelector('[title="More actions"]')!;
      fireEvent.click(kebab);

      const viewButton = screen.getByRole("button", { name: "View" });
      fireEvent.click(viewButton);

      expect(navigateMock).toHaveBeenCalledWith(`/my-uploads/${row.id}`, { state: { item: row } });
    });

    it("opens the delete modal with the row item when 'Delete' is clicked", () => {
      const row = makeRow({ id: "queue-abc" });
      const open = vi.fn();
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({ items: [row], deleteModal: { ...makeHookReturn().deleteModal, open } }),
      );

      const { container } = render(<MyUploadedDocumentsTable />);

      const kebab = container.querySelector('[title="More actions"]')!;
      fireEvent.click(kebab);

      // The kebab menu lists a "Delete" action; clicking it opens the modal.
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      expect(open).toHaveBeenCalledWith(row);
    });
  });

  describe("delete modal", () => {
    it("renders the PENDING destructive copy when a PENDING item is the target", () => {
      const target = makeRow({ status: "PENDING", file_name: "pending.pdf" });
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          deleteModal: {
            ...makeHookReturn().deleteModal,
            target,
            isDeleting: false,
            close: vi.fn(),
            confirm: vi.fn(),
          },
        }),
      );

      render(<MyUploadedDocumentsTable />);

      expect(screen.getByText("Delete this upload?")).toBeInTheDocument();
      expect(
        screen.getByText(/permanently deleted too. This can't be undone./),
      ).toBeInTheDocument();
    });

    it("renders the APPROVED non-destructive copy when an APPROVED item is the target", () => {
      const target = makeRow({ status: "APPROVED", file_name: "approved.pdf" });
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          deleteModal: {
            ...makeHookReturn().deleteModal,
            target,
            isDeleting: false,
            close: vi.fn(),
            confirm: vi.fn(),
          },
        }),
      );

      render(<MyUploadedDocumentsTable />);

      expect(screen.getByText("Remove from my uploads?")).toBeInTheDocument();
      expect(
        screen.getByText(/The incoming document and its PDF stay in the system/, { exact: false }),
      ).toBeInTheDocument();
    });

    it("renders the INVALIDATED destructive copy when an INVALIDATED item is the target", () => {
      const target = makeRow({ status: "INVALIDATED", file_name: "invalidated.pdf" });
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          deleteModal: {
            ...makeHookReturn().deleteModal,
            target,
            isDeleting: false,
            close: vi.fn(),
            confirm: vi.fn(),
          },
        }),
      );

      render(<MyUploadedDocumentsTable />);

      expect(screen.getByText("Delete this upload?")).toBeInTheDocument();
      expect(
        screen.getByText(/permanently deletes the remaining records/, { exact: false }),
      ).toBeInTheDocument();
    });

    it("renders a Cancel button and a confirm button", () => {
      const target = makeRow();
      const close = vi.fn();
      const confirm = vi.fn();
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          deleteModal: {
            ...makeHookReturn().deleteModal,
            target,
            isDeleting: false,
            close,
            confirm,
          },
        }),
      );

      render(<MyUploadedDocumentsTable />);

      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      // The confirm button text is the status-dependent action label:
      //   "Delete" for PENDING / INVALIDATED, "Remove" for APPROVED.
      // The mocked row here defaults to status PENDING → copy "Delete".
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    it("calls confirm (onSubmit) when the confirm button is clicked", () => {
      const target = makeRow();
      const confirm = vi.fn();
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          deleteModal: {
            ...makeHookReturn().deleteModal,
            target,
            isDeleting: false,
            close: vi.fn(),
            confirm,
          },
        }),
      );

      render(<MyUploadedDocumentsTable />);

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(confirm).toHaveBeenCalled();
    });

    it("calls close when Cancel is clicked", () => {
      const target = makeRow();
      const close = vi.fn();
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          deleteModal: {
            ...makeHookReturn().deleteModal,
            target,
            isDeleting: false,
            close,
            confirm: vi.fn(),
          },
        }),
      );

      render(<MyUploadedDocumentsTable />);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(close).toHaveBeenCalled();
    });

    it("shows the pending label and a spinner when isDeleting is true", () => {
      const target = makeRow();
      vi.mocked(useMyExtractedQueueTable).mockReturnValue(
        makeHookReturn({
          deleteModal: {
            ...makeHookReturn().deleteModal,
            target,
            isDeleting: true,
            close: vi.fn(),
            confirm: vi.fn(),
          },
        }),
      );

      render(<MyUploadedDocumentsTable />);

      expect(screen.getByText("Deleting...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });
  });
});
