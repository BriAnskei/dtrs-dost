/**
 * Unit tests for `MyUploadedDocumentDetailsPage` — the per-queue detail view a
 * receiver opens from the uploads list.
 *
 * THE COMPONENT (view-components/MyUploadedDocumentDetailsPage.tsx):
 *
 *   Reads the route param `id`, resolves the queue item from router state or
 *   the react-query cache (`useMyQueueItem`), and — depending on `item.status`
 *   and the admin's decision — renders a different answer section via
 *   `<MyUploadedDocumentOutcome>`:
 *
 *     status PENDING      → outcome is null; page shows the AI extraction result
 *                           card (the document the AI read before review).
 *     status APPROVED     → fetches the approved incoming document
 *                           (`useGetIncomingDocumentByQueue`); outcome shows the
 *                           incoming record, tracking status, and per-field AI
 *                           extraction comparison.
 *     status INVALIDATED  → fetches the admin's invalidation response; outcome
 *                           shows the reason, wrapped in an "Advanced details"
 *                           disclosure that also surfaces the AI extraction card.
 *
 *   A "Back to My Uploads" link and a per-status "Delete / Remove" button are
 *   always present in the header. The delete button opens `<DeleteQueueModal>`.
 *
 * ─── MOCKING STRATEGY ─────────────────────────────────────────────────────────
 *
 *   We test the COMPONENT's UI branching only — what the user sees per status —
 *   not the network layer. So:
 *
 *     - `useParams`        → returns a fixed `{ id }` so the page has an id.
 *     - `useNavigate`      → mocked so the Back/Delete navigation assertions
 *                            don't depend on a real router.
 *     - `useMyQueueItem`   → returns the queue item under test (or null).
 *     - `useGetIncomingDocumentByQueue` → returns controlled `data/isLoading/isError`.
 *     - `useDeleteQueueModal` → returns a controlled modal target + callbacks.
 *     - `sonner` toast     → mocked (delete flow surfaces toasts via the
 *                            underlying mutation in useDeleteExtractedDocumentQueue).
 *
 *   With these, every status × decision × outcome combination is reachable
 *   without a QueryClientProvider or real HTTP.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import MyUploadedDocumentDetailsPage from "../view-components/MyUploadedDocumentDetailsPage";
import type { MyExtractedDocumentQueue } from "../types/extracted-queue-receiver-types";
import type { IncomingDocumentDetailsDto, InvalidationResponseDto } from "../types/get-incoming-document-by-queue.dto";

/* ─── Mocks ─────────────────────────────────────────────────────────────────── */

const navigateMock = vi.fn();
const useParamsMock = vi.fn();
const useMyQueueItemMock = vi.fn();
const useGetIncomingDocumentByQueueMock = vi.fn();
const useDeleteQueueModalMock = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => useParamsMock(),
  };
});

vi.mock("../hooks/use-my-queue-item", () => ({
  useMyQueueItem: (id: string) => useMyQueueItemMock(id),
}));

vi.mock("../hooks/api/use-get-incoming-document-by-queue", () => ({
  useGetIncomingDocumentByQueue: (id: string, enabled: boolean) =>
    useGetIncomingDocumentByQueueMock(id, enabled),
}));

vi.mock("../hooks/use-delete-queue-modal", () => ({
  useDeleteQueueModal: (opts?: { onDeleted?: () => void }) => useDeleteQueueModalMock(opts),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/* PageMeta uses react-helmet-async (needs a HelmetProvider). Mock it to a no-op
 * so the page renders without that provider — we are only asserting the
 * document's own UI, not SEO side-effects. */
vi.mock("../../../../components/common/PageMeta", () => ({
  __esModule: true,
  default: () => null,
}));

/* ─── Fixtures ─────────────────────────────────────────────────────────────── */

const APPROVED_DETAILS: IncomingDocumentDetailsDto = {
  subject: "Procurement of Widgets",
  from: "procurement@gov.ph",
  to: "suppier@gov.ph",
  date_received: "2025-01-08",
  summary: "Purchase request for widgets.",
  status: "complete",
  updated_at: "2025-01-10T08:00:00.000Z",
  created_at: "2025-01-09T08:00:00.000Z",
};

const INVALIDATION: InvalidationResponseDto = {
  response: "Document was incomplete. Please re-upload.",
  created_at: "2025-01-09T10:00:00.000Z",
};

/** Base queue item; override `decision` / `status` / `fields` per scenario. */
function makeItem(
  overrides: Partial<MyExtractedDocumentQueue> = {},
): MyExtractedDocumentQueue {
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

/** A delete-modal return shaped like useDeleteQueueModal's output. */
function makeDeleteModal(overrides: Record<string, unknown> = {}) {
  return {
    target: null,
    isOpen: false,
    isDeleting: false,
    open: vi.fn(),
    close: vi.fn(),
    confirm: vi.fn(),
    ...overrides,
  };
}

/* ─── Default hooks ────────────────────────────────────────────────────────── */

function applyDefaults() {
  useParamsMock.mockReturnValue({ id: "queue-1" });
  useMyQueueItemMock.mockReturnValue(makeItem());
  useGetIncomingDocumentByQueueMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
  });
  useDeleteQueueModalMock.mockReturnValue(makeDeleteModal());
  navigateMock.mockClear();
}

beforeEach(() => {
  applyDefaults();
});

/* Wrap in a MemoryRouter so react-router's <Link>/context-dependent primitives
 * resolve (the page's useParams/useNavigate stay mocked). */
function renderPage() {
  return render(
    <MemoryRouter>
      <MyUploadedDocumentDetailsPage />
    </MemoryRouter>,
  );
}

/* ─── Tests ─────────────────────────────────────────────────────────────────── */

describe("MyUploadedDocumentDetailsPage", () => {
  describe("not-found state", () => {
    it("renders a 'could not be found' notice when useMyQueueItem returns null", () => {
      useMyQueueItemMock.mockReturnValue(null);

      renderPage();

      // The notice text lives in a single <p>; match the leading sentence via a
      // regex so the full-sentence matcher doesn't reject the extra trailing copy.
      expect(
        screen.getByText(/This document could not be found\./),
      ).toBeInTheDocument();
    });

    it("does NOT render the delete button when the item is missing", () => {
      useMyQueueItemMock.mockReturnValue(null);

      renderPage();

      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });

  describe("header", () => {
    it("renders the file name in the page header", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ file_name: "receipt-42.pdf" }));

      renderPage();

      expect(screen.getByText("receipt-42.pdf")).toBeInTheDocument();
    });

    it("renders the uploaded-at datetime", () => {
      useMyQueueItemMock.mockReturnValue(
        makeItem({ created_at: "2025-01-02T03:04:05.000Z" }),
      );

      const { container } = renderPage();

      const formatted = new Date("2025-01-02T03:04:05.000Z").toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      expect(container.textContent).toContain(`Uploaded ${formatted}`);
    });

    it("renders a status badge for the queue status", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "APPROVED" }));

      const { container } = renderPage();

      // QUEUE_STATUS_BADGE maps APPROVED → label "Approved".
      expect(container.textContent).toContain("Approved");
    });

    it("renders a Back button that navigates to the uploads list", () => {
      renderPage();

      const back = screen.getByRole("button", { name: "Back to My Uploads" });
      fireEvent.click(back);

      expect(navigateMock).toHaveBeenCalledWith("/my-uploads");
    });

    it("renders a Delete button in the header", () => {
      renderPage();

      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });
  });

  describe("PENDING status", () => {
    it("shows the status summary for waiting", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "PENDING" }));

      renderPage();

      expect(
        screen.getByText(/Waiting for an admin to review this document./),
      ).toBeInTheDocument();
    });

    it("renders the AI extraction result card (no incoming document section)", () => {
      useMyQueueItemMock.mockReturnValue(
        makeItem({ status: "PENDING", decision: "REVIEW" }),
      );

      renderPage();

      // Decision REVIEW → label "Needs review", message "Some details have low confidence."
      expect(screen.getByText("Needs review")).toBeInTheDocument();
      expect(screen.getByText(/Some details have low confidence./)).toBeInTheDocument();
    });

    it("does NOT fetch incoming document details for PENDING (enabled=false)", () => {
      renderPage();

      expect(useGetIncomingDocumentByQueueMock).toHaveBeenCalledWith("queue-1", false);
    });
  });

  describe("APPROVED status", () => {
    it("shows the status summary for approved", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "APPROVED" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: APPROVED_DETAILS,
        isLoading: false,
        isError: false,
        error: undefined,
      });

      renderPage();

      expect(
        screen.getByText(/Approved by an admin\. The incoming document below is the final record\./),
      ).toBeInTheDocument();
    });

    it("renders the incoming document panel with tracking status and dates", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "APPROVED" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: APPROVED_DETAILS,
        isLoading: false,
        isError: false,
        error: undefined,
      });

      renderPage();

      expect(screen.getByText("Incoming document")).toBeInTheDocument();
      // "Tracking:" label and the capitalized status sit in separate spans.
      expect(screen.getByText("Tracking:")).toBeInTheDocument();
      expect(screen.getByText("Complete")).toBeInTheDocument();
      expect(screen.getByText(`Approved at ${new Date(APPROVED_DETAILS.created_at).toLocaleString("en-PH", {
        year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
      })}`)).toBeInTheDocument();
    });

    it("renders a loading skeleton in the outcome while fetching", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "APPROVED" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: undefined,
      });

      const { container } = renderPage();

      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    });

    it("renders an error notice when the outcome fetch fails", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "APPROVED" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Network down"),
      });

      renderPage();

      expect(screen.getByText(/Network down/)).toBeInTheDocument();
    });

    it("renders the per-field incoming values via MyUploadedIncomingFields", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "APPROVED" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: APPROVED_DETAILS,
        isLoading: false,
        isError: false,
        error: undefined,
      });

      renderPage();

      expect(screen.getByText("Subject")).toBeInTheDocument();
      expect(screen.getByText(APPROVED_DETAILS.subject)).toBeInTheDocument();
      expect(screen.getByText(APPROVED_DETAILS.from)).toBeInTheDocument();
    });

    it("renders the AI extraction result card in the advanced-details disclosure", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "INVALIDATED", decision: "INVALID" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: INVALIDATION,
        isLoading: false,
        isError: false,
        error: undefined,
      });

      const { container } = renderPage();

      // The disclosure's child is the AI extraction card (header="none"), which
      // always renders the confidence footer note.
      expect(container.textContent).toContain(
        "The percentage is the effective confidence (source and AI combined).",
      );
    });
  });

  describe("INVALIDATED status", () => {
    it("shows the status summary for invalidated", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "INVALIDATED" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: INVALIDATION,
        isLoading: false,
        isError: false,
        error: undefined,
      });

      renderPage();

      expect(screen.getByText("Invalidated by an admin.")).toBeInTheDocument();
    });

    it("renders the admin's reason from the invalidation response", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "INVALIDATED" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: INVALIDATION,
        isLoading: false,
        isError: false,
        error: undefined,
      });

      renderPage();

      expect(screen.getByText("Reason from admin")).toBeInTheDocument();
      expect(screen.getByText(INVALIDATION.response)).toBeInTheDocument();
    });

    it("wraps the AI extraction in an 'Advanced details' disclosure", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "INVALIDATED", decision: "INVALID" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: INVALIDATION,
        isLoading: false,
        isError: false,
        error: undefined,
      });

      renderPage();

      // The toggle shows the title and description; the panel body is collapsed
      // (aria-expanded=false) until opened.
      expect(screen.getByText("Advanced details")).toBeInTheDocument();
      expect(screen.getByText("AI extraction results")).toBeInTheDocument();
      const toggle = screen.getByRole("button", { name: /Advanced details/i });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("reveals AI extraction when the Advanced details disclosure is opened", () => {
      useMyQueueItemMock.mockReturnValue(makeItem({ status: "INVALIDATED", decision: "INVALID" }));
      useGetIncomingDocumentByQueueMock.mockReturnValue({
        data: INVALIDATION,
        isLoading: false,
        isError: false,
        error: undefined,
      });

      renderPage();

      const toggle = screen.getByRole("button", { name: /Advanced details/i });
      fireEvent.click(toggle);

      // Opening the disclosure flips aria-expanded to true and the panel body's
      // AI-extraction description is now present.
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByText("What the AI read from your upload before the admin invalidated it."),
      ).toBeInTheDocument();
    });
  });

  describe("delete button → modal wiring", () => {
    it("opens the delete modal with the item when Delete is clicked", () => {
      const open = vi.fn();
      const item = makeItem({ status: "APPROVED" });
      useMyQueueItemMock.mockReturnValue(item);
      useDeleteQueueModalMock.mockReturnValue(makeDeleteModal({ open }));

      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(open).toHaveBeenCalledWith(item);
    });

    it("renders the delete modal when a target is set", () => {
      const item = makeItem({ status: "PENDING" });
      useDeleteQueueModalMock.mockReturnValue(
        makeDeleteModal({ target: item, isDeleting: false, close: vi.fn(), confirm: vi.fn() }),
      );

      renderPage();

      expect(screen.getByText("Delete this upload?")).toBeInTheDocument();
    });

    it("shows Deleting... and disables Cancel while isDeleting", () => {
      const item = makeItem({ status: "PENDING" });
      useDeleteQueueModalMock.mockReturnValue(
        makeDeleteModal({ target: item, isDeleting: true, close: vi.fn(), confirm: vi.fn() }),
      );

      renderPage();

      expect(screen.getByText("Deleting...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    it("navigates to the list with replace after delete (onDeleted callback)", () => {
      // The page wires onDeleted={ () => navigate("/my-uploads", { replace: true }) }.
      const item = makeItem({ status: "APPROVED" });
      useDeleteQueueModalMock.mockReturnValue(
        makeDeleteModal({ target: item, isDeleting: false, close: vi.fn(), confirm: vi.fn() }),
      );

      // Capture the onDeleted passed to the hook and invoke it to prove wiring.
      let captured: { onDeleted?: () => void } = {};
      useDeleteQueueModalMock.mockImplementation((opts?: { onDeleted?: () => void }) => {
        captured = opts ?? {};
        return makeDeleteModal({ target: item, isDeleting: false, close: vi.fn(), confirm: vi.fn() });
      });

      renderPage();

      // The hook is called once with the onDeleted callback.
      expect(captured.onDeleted).toEqual(expect.any(Function));
      // Invoking it navigates to the list, replacing history.
      captured.onDeleted?.();
      expect(navigateMock).toHaveBeenCalledWith("/my-uploads", { replace: true });
    });
  });
});
