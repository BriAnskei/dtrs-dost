/**
 * Unit tests for `ReceiverUploadPanel` — the main component for the receiver
 * upload flow. It consumes `useReceiverUpload` and renders different sub-views
 * based on the hook's status.
 *
 * THE COMPONENT (components/ReceiverUploadPanel.tsx):
 *
 *   ReceiverUploadPanel() — no props; all state comes from the hook.
 *
 * Status → UI mapping:
 *   status="idle"            → <PdfDropzone> (file picker / drag-drop)
 *   busy || queue_failed     → <UploadProcessingCard> (spinner progress list)
 *                               with the file name + activeIdx + failed flag
 *   status="queued" && result → <UploadResultCard> (decision + per-field bars)
 *   status="queued" && !result → <UploadSuccessCard> ("Sent for validation")
 *
 * Button bar visibility per status:
 *   "idle"    → Submit button (disabled if no file)
 *   busy      → "Processing..." (disabled)
 *   queue_failed → Start Over (secondary) + Retry (primary)
 *   queued    → Upload Another (primary)
 *
 * WHAT WE MOCK:
 *   - `useReceiverUpload` hook — we control every return value so we can test
 *     each status branch independently without PDF extraction or network calls.
 *   - `PdfDropzone` — stubbed to a simple div so we don't pull in the real
 *     dropzone (which needs pdfjs, file handling, etc.).
 *
 * SCENARIOS COVERED:
 *   1. idle + no file → PdfDropzone shown, Submit disabled.
 *   2. idle + file → PdfDropzone shown, Submit enabled.
 *   3. idle → Submit click calls submit().
 *   4. busy (processing) → UploadProcessingCard shown, Processing button shown.
 *   5. queue_failed → UploadProcessingCard (failed) shown, Start Over + Retry buttons.
 *   6. queued + result → UploadResultCard shown, Upload Another button.
 *   7. queued + no result → UploadSuccessCard shown, Upload Another button.
 *   8. Start Over button calls startOver().
 *   9. Retry button calls retryQueue().
 *  10. Submit button calls submit().
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReceiverUploadPanel from "./ReceiverUploadPanel";
import type { ReceiverUploadResponse } from "../types/reciever-upload-api-types";
import type { ReceiverUploadStatus } from "../hooks/use-reciever-upload";

/* ─── Mock the hook ──────────────────────────────────────────────────────────── */

const mockSubmit = vi.fn();
const mockSelectFile = vi.fn();
const mockRetryQueue = vi.fn();
const mockStartOver = vi.fn();

const { mockUseReceiverUpload } = vi.hoisted(() => ({
  mockUseReceiverUpload: vi.fn(),
}));

vi.mock("../hooks/use-reciever-upload", () => ({
  useReceiverUpload: mockUseReceiverUpload,
}));

/* ─── Stub PdfDropzone ───────────────────────────────────────────────────────── */

vi.mock("../../admins/components/PDFDropzone", () => ({
  __esModule: true,
  default: function MockPdfDropzone({ file, onSelect }: { file: unknown; onSelect: (f: unknown) => void }) {
    return (
      <div data-testid="pdf-dropzone">
        <span data-testid="dropzone-file">{file ? file.name : "no-file"}</span>
        <button
          data-testid="dropzone-select"
          onClick={() => onSelect({ name: "selected.pdf" })}
        >
          select
        </button>
      </div>
    );
  },
}));

/* ─── Stub sub-components ─────────────────────────────────────────────────────── */

vi.mock("./UploadProcessingCard", () => ({
  __esModule: true,
  default: function MockUploadProcessingCard({
    fileName,
    activeIdx,
    failed,
  }: {
    fileName: string;
    activeIdx: number;
    failed?: boolean;
  }) {
    return (
      <div data-testid="upload-processing-card" data-failed={failed ? "true" : "false"}>
        <span data-testid="processing-filename">{fileName}</span>
        <span data-testid="processing-idx">{activeIdx}</span>
      </div>
    );
  },
}));

vi.mock("./UploadResultCard", () => ({
  __esModule: true,
  default: function MockUploadResultCard({
    fileName,
    result,
  }: {
    fileName: string;
    result: ReceiverUploadResponse;
  }) {
    return (
      <div data-testid="upload-result-card">
        <span data-testid="result-filename">{fileName}</span>
        <span data-testid="result-decision">{result.decision}</span>
      </div>
    );
  },
}));

vi.mock("./UploadSuccessCard", () => ({
  __esModule: true,
  default: function MockUploadSuccessCard({ fileName }: { fileName: string }) {
    return <div data-testid="upload-success-card">{fileName}</div>;
  },
}));

/* ─── Fixtures ───────────────────────────────────────────────────────────────── */

function makeMockReturn(overrides: Partial<{
  file: File | null;
  status: ReceiverUploadStatus;
  busy: boolean;
  activeIdx: number;
  result: ReceiverUploadResponse | null;
}> = {}) {
  const status: ReceiverUploadStatus = overrides.status ?? "idle";
  const file = overrides.file ?? null;
  const busy = overrides.busy ?? (status === "processing" || status === "queueing");
  const activeIdx = overrides.activeIdx ?? (
    status === "queued"
      ? 3
      : status === "queueing" || status === "queue_failed"
        ? 1
        : 0
  );
  const result = overrides.result ?? null;

  return {
    file,
    status,
    busy,
    activeIdx,
    result,
    selectFile: mockSelectFile,
    submit: mockSubmit,
    retryQueue: mockRetryQueue,
    startOver: mockStartOver,
  };
}

const VALID_RESPONSE: ReceiverUploadResponse = {
  decision: "ACCEPT",
  fields: [
    { field: "subject", value: "Foo", chunkIds: ["c1"], aiConfidence: 90, sourceConfidence: 95, effectiveConfidence: 86 },
  ],
};

function makeFile(name = "test.pdf"): File {
  return new File(["pdf-bytes"], name, { type: "application/pdf" });
}

/* ─── Tests ───────────────────────────────────────────────────────────────────── */

describe("ReceiverUploadPanel", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
    mockSelectFile.mockClear();
    mockRetryQueue.mockClear();
    mockStartOver.mockClear();
  });

  /* ── Status: idle ──────────────────────────────────────────────────────────── */

  describe("status: idle", () => {
    it("renders PdfDropzone when idle with no file", () => {
      mockUseReceiverUpload.mockReturnValue(makeMockReturn({ status: "idle" }));

      render(<ReceiverUploadPanel />);

      expect(screen.getByTestId("pdf-dropzone")).toBeInTheDocument();
      expect(screen.getByTestId("dropzone-file")).toHaveTextContent("no-file");
    });

    it("renders PdfDropzone with the file name when idle with a file", () => {
      const file = makeFile("my-doc.pdf");
      mockUseReceiverUpload.mockReturnValue(makeMockReturn({ status: "idle", file }));

      render(<ReceiverUploadPanel />);

      expect(screen.getByTestId("dropzone-file")).toHaveTextContent("my-doc.pdf");
    });

    it("renders the Upload header and description text", () => {
      mockUseReceiverUpload.mockReturnValue(makeMockReturn());

      render(<ReceiverUploadPanel />);

      expect(screen.getByText("Upload incoming document")).toBeInTheDocument();
      expect(
        screen.getByText(/Upload the PDF. An admin will validate it/),
      ).toBeInTheDocument();
    });

    it("Submit button is disabled when no file is selected", () => {
      mockUseReceiverUpload.mockReturnValue(makeMockReturn({ status: "idle" }));

      render(<ReceiverUploadPanel />);

      const submitBtn = screen.getByText("Submit");
      expect(submitBtn).toBeDisabled();
    });

    it("Submit button is enabled when a file is selected", () => {
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "idle", file: makeFile() }),
      );

      render(<ReceiverUploadPanel />);

      const submitBtn = screen.getByText("Submit");
      expect(submitBtn).not.toBeDisabled();
    });

    it("Submit button click calls submit()", () => {
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "idle", file: makeFile() }),
      );

      render(<ReceiverUploadPanel />);
      fireEvent.click(screen.getByText("Submit"));

      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });

  /* ── Status: busy (processing) ─────────────────────────────────────────────── */

  describe("status: busy (processing)", () => {
    it("renders UploadProcessingCard when busy", () => {
      const file = makeFile("doc.pdf");
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "processing", file, busy: true, activeIdx: 0 }),
      );

      render(<ReceiverUploadPanel />);

      expect(screen.getByTestId("upload-processing-card")).toBeInTheDocument();
      expect(screen.getByTestId("processing-filename")).toHaveTextContent("doc.pdf");
      // activeIdx 0 → first step active (Reading document).
      expect(screen.getByTestId("processing-idx")).toHaveTextContent("0");
      expect(screen.getByTestId("upload-processing-card")).toHaveAttribute(
        "data-failed",
        "false",
      );
    });

    it("renders a disabled 'Processing...' button", () => {
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "processing", file: makeFile(), busy: true }),
      );

      render(<ReceiverUploadPanel />);

      expect(screen.getByText("Processing...")).toBeDisabled();
    });
  });

  /* ── Status: queueing ─────────────────────────────────────────────────────── */

  describe("status: queueing", () => {
    it("renders UploadProcessingCard when queueing", () => {
      const file = makeFile("doc.pdf");
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "queueing", file, busy: true, activeIdx: 1 }),
      );

      render(<ReceiverUploadPanel />);

      expect(screen.getByTestId("upload-processing-card")).toBeInTheDocument();
      expect(screen.getByTestId("processing-filename")).toHaveTextContent("doc.pdf");
      // activeIdx 1 → second step active (Extracting details).
      expect(screen.getByTestId("processing-idx")).toHaveTextContent("1");
    });

    it("renders a disabled 'Processing...' button when queueing", () => {
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "queueing", file: makeFile(), busy: true }),
      );

      render(<ReceiverUploadPanel />);

      expect(screen.getByText("Processing...")).toBeDisabled();
    });
  });

  /* ── Status: queue_failed ─────────────────────────────────────────────────── */

  describe("status: queue_failed", () => {
    it("renders UploadProcessingCard with failed=true", () => {
      const file = makeFile("doc.pdf");
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "queue_failed", file, busy: false, activeIdx: 1 }),
      );

      render(<ReceiverUploadPanel />);

      expect(screen.getByTestId("upload-processing-card")).toBeInTheDocument();
      expect(screen.getByTestId("upload-processing-card")).toHaveAttribute(
        "data-failed",
        "true",
      );
    });

    it("renders 'Start Over' (secondary) and 'Retry' (primary) buttons", () => {
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "queue_failed", file: makeFile() }),
      );

      render(<ReceiverUploadPanel />);

      expect(screen.getByText("Start Over")).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    it("'Retry' button calls retryQueue()", () => {
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "queue_failed", file: makeFile() }),
      );

      render(<ReceiverUploadPanel />);
      fireEvent.click(screen.getByText("Retry"));

      expect(mockRetryQueue).toHaveBeenCalledTimes(1);
    });

    it("'Start Over' button calls startOver()", () => {
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({ status: "queue_failed", file: makeFile() }),
      );

      render(<ReceiverUploadPanel />);
      fireEvent.click(screen.getByText("Start Over"));

      expect(mockStartOver).toHaveBeenCalledTimes(1);
    });
  });

  /* ── Status: queued ───────────────────────────────────────────────────────── */

  describe("status: queued", () => {
    it("renders UploadResultCard when result is present", () => {
      const file = makeFile("doc.pdf");
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({
          status: "queued",
          file,
          busy: false,
          activeIdx: 3,
          result: VALID_RESPONSE,
        }),
      );

      render(<ReceiverUploadPanel />);

      expect(screen.getByTestId("upload-result-card")).toBeInTheDocument();
      expect(screen.getByTestId("result-filename")).toHaveTextContent("doc.pdf");
      expect(screen.getByTestId("result-decision")).toHaveTextContent("ACCEPT");
    });

    it("renders UploadSuccessCard when no result yet", () => {
      const file = makeFile("doc.pdf");
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({
          status: "queued",
          file,
          busy: false,
          activeIdx: 3,
          result: null,
        }),
      );

      render(<ReceiverUploadPanel />);

      expect(screen.getByTestId("upload-success-card")).toBeInTheDocument();
      expect(screen.getByTestId("upload-success-card")).toHaveTextContent("doc.pdf");
    });

    it("renders 'Upload Another' button and it calls startOver()", () => {
      mockUseReceiverUpload.mockReturnValue(
        makeMockReturn({
          status: "queued",
          file: makeFile(),
          result: VALID_RESPONSE,
        }),
      );

      render(<ReceiverUploadPanel />);
      const uploadAnotherBtn = screen.getByText("Upload Another");
      expect(uploadAnotherBtn).not.toBeDisabled();

      fireEvent.click(uploadAnotherBtn);
      expect(mockStartOver).toHaveBeenCalledTimes(1);
    });
  });
});
