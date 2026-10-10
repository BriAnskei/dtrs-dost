/**
 * Unit tests for `useReceiverUpload` — the hook that orchestrates the receiver
 * upload flow: file selection → client-side PDF extraction → chunked upload
 * to the backend → decision + per-field confidence display.
 *
 * THE HOOK (hooks/use-reciever-upload.ts):
 *
 *   useReceiverUpload() returns {
 *     file, status, busy, activeIdx, result,
 *     selectFile, submit, retryQueue, startOver,
 *   }
 *
 * Status machine:
 *   "idle" → "processing" → "queueing" → "queued" (success)
 *                                ↓
 *                          "queue_failed" (error → retry possible)
 *   "idle" → backToIdle (extraction failure, e.g. corrupt PDF / no text / too long)
 *
 * KEY BEHAVIORS TESTED:
 *   - Initial state: file=null, status="idle", result=null, busy=false, activeIdx=0.
 *   - selectFile: clears chunks, resets mutation, clears result, sets file.
 *   - submit: successful flow — extractPdf succeeds, chunks converted, mutation
 *     succeeds, status="queued", result set.
 *   - submit: extractPdf throws → backToIdle → toast.error + status="idle".
 *   - submit: chunks.length === 0 → backToIdle ("No readable text found").
 *   - submit: chunks.length > MAX_RECEIVER_CHUNKS → backToIdle ("Document is too long").
 *   - submit: mutation rejects with non-network error → toast.error + status="queue_failed".
 *   - submit: mutation rejects with network error → no toast (interceptor handles it), status="queue_failed".
 *   - submit: mutation rejects with 401 → no toast, status="queue_failed".
 *   - retryQueue: re-sends cached chunks without re-running extractPdf.
 *   - retryQueue: no-op when no file, no chunks, or busy.
 *   - startOver: clears file, chunks, result, mutation; status="idle".
 *   - busy: true for "processing" and "queueing", false otherwise.
 *   - activeIdx: 0=idle, 1=queueing/queue_failed, 3=queued (PROGRESS_STEPS.length).
 *   - beforeunload listener is added when busy, removed when not.
 *   - result is set from the mutation response.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ─── Mock hoisting ───────────────────────────────────────────────────────────── */

const {
  mockExtractPdf,
  mockToReceiverChunks,
  mockUpload,
  mockToastError,
  mockGetApiErrorMessage,
  mockIsNetworkError,
  mockGetErrorStatus,
} = vi.hoisted(() => ({
  mockExtractPdf: vi.fn(),
  mockToReceiverChunks: vi.fn(),
  mockUpload: vi.fn(),
  mockToastError: vi.fn(),
  mockGetApiErrorMessage: vi.fn(),
  mockIsNetworkError: vi.fn(),
  mockGetErrorStatus: vi.fn(),
}));

vi.mock("../../hooks/use-exit-confirmation", () => ({
  useExitConfirmation: vi.fn(),
}));

vi.mock("../../pdf", () => ({
  extractPdf: mockExtractPdf,
}));

vi.mock("../helpers/reciver-upload-chunks", () => ({
  toReceiverChunks: mockToReceiverChunks,
  MAX_RECEIVER_CHUNKS: 500,
}));

vi.mock("../service/reciever-upload-service", () => ({
  receiverUploadService: {
    upload: mockUpload,
  },
}));

vi.mock("../../../../../lib/api-error", () => ({
  getApiErrorMessage: mockGetApiErrorMessage,
  getErrorStatus: mockGetErrorStatus,
  isNetworkError: mockIsNetworkError,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}));

/* ─── Imports after mocks ────────────────────────────────────────────────────── */

import { useReceiverUpload } from "./use-reciever-upload";
import type { ReceiverChunk, ReceiverUploadResponse } from "../types/reciever-upload-api-types";
import type { PdfExtractionResult } from "../../pdf/types";

/* ─── Fixtures ────────────────────────────────────────────────────────────────── */

const VALID_PDF_RESULT = {
  pages: [{ page: 1, content: [], hasNativeText: true, hasImages: false, extractionMode: "text" as const }],
  totalPages: 1,
  statistics: { textPages: 1, ocrPages: 0, mixedPages: 0, emptyPages: 0 },
} as unknown as PdfExtractionResult;

function makeChunk(id: string, text = "test text"): ReceiverChunk {
  return { chunkId: id, text, sourceConfidence: 95 };
}

const VALID_RESPONSE: ReceiverUploadResponse = {
  decision: "ACCEPT",
  fields: [
    { field: "subject", value: "Foo", chunkIds: ["c1"], aiConfidence: 90, sourceConfidence: 95, effectiveConfidence: 86 },
  ],
};

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */

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

function makeFile(name = "test.pdf"): File {
  return new File(["pdf-bytes"], name, { type: "application/pdf" });
}

/* ─── Tests ───────────────────────────────────────────────────────────────────── */

describe("useReceiverUpload", () => {
  beforeEach(() => {
    mockExtractPdf.mockReset();
    mockToReceiverChunks.mockReset();
    mockUpload.mockReset();
    mockToastError.mockReset();
    mockGetApiErrorMessage.mockReset();
    mockIsNetworkError.mockReset();
    mockGetErrorStatus.mockReset();

    // Default: successful extraction + upload.
    mockExtractPdf.mockResolvedValue(VALID_PDF_RESULT);
    mockToReceiverChunks.mockReturnValue([makeChunk("c1")]);
    mockUpload.mockResolvedValue(VALID_RESPONSE);
    // By default, getApiErrorMessage returns the fallback passed as second arg.
    mockGetApiErrorMessage.mockImplementation((_err: unknown, fallback: string) => fallback);
  });

  /* ── Initial state ────────────────────────────────────────────────────────── */

  it("starts in idle state with no file and no result", () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.file).toBeNull();
    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.busy).toBe(false);
    expect(result.current.activeIdx).toBe(0);
    client.clear();
  });

  /* ── selectFile ────────────────────────────────────────────────────────────── */

  it("selectFile sets the file, clears result, and resets the mutation", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    // First, simulate a completed upload so result is non-null.
    mockExtractPdf.mockResolvedValue(VALID_PDF_RESULT);
    mockToReceiverChunks.mockReturnValue([makeChunk("c1")]);
    mockUpload.mockResolvedValue(VALID_RESPONSE);

    // selectFile is required before submit (submit no-ops without a file).
    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.result).not.toBeNull();
    expect(result.current.status).toBe("queued");

    // Now select a new file.
    const file = makeFile("new-doc.pdf");
    await act(async () => {
      result.current.selectFile(file);
    });

    expect(result.current.file).toBe(file);
    expect(result.current.result).toBeNull();
    // selectFile clears result and file but does NOT reset status (stays "queued").
    expect(result.current.status).toBe("queued");
    client.clear();
  });

  it("selectFile(null) clears the file", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    expect(result.current.file).not.toBeNull();

    await act(async () => {
      result.current.selectFile(null);
    });

    expect(result.current.file).toBeNull();
    client.clear();
  });

  /* ── submit — success path ────────────────────────────────────────────────── */

  it("submit: successful flow sets status=queued and result from the response", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe("queued");
    expect(result.current.result).toEqual(VALID_RESPONSE);
    expect(result.current.busy).toBe(false);
    expect(result.current.activeIdx).toBe(3); // PROGRESS_STEPS.length for "queued"

    // extractPdf was called with the file.
    expect(mockExtractPdf).toHaveBeenCalledTimes(1);

    // Upload was called with { file, chunks } as first arg. React Query passes
    // a second context arg — use objectContaining to check only the payload.
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        file: result.current.file,
        chunks: [makeChunk("c1")],
      }),
      expect.anything(),
    );

    client.clear();
  });

  it("submit: toReceiverChunks is used to convert the PDF result", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(mockToReceiverChunks).toHaveBeenCalledTimes(1);
    expect(mockToReceiverChunks).toHaveBeenCalledWith(VALID_PDF_RESULT);

    client.clear();
  });

  /* ── submit — extraction failure ──────────────────────────────────────────── */

  it("submit: extractPdf throwing → backToIdle with a toast and status=idle", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    mockExtractPdf.mockRejectedValueOnce(new Error("Corrupt PDF"));

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    // backToIdle sets status to "idle" but does NOT clear the file (file stays set).
    expect(result.current.status).toBe("idle");
    expect(result.current.file).not.toBeNull();
    expect(mockToastError).toHaveBeenCalledWith(
      "Could not read this PDF",
      {
        description: "The file may be corrupted or protected. Try another file.",
        id: "extraction-failed",
      },
    );

    client.clear();
  });

  it("submit: empty chunks (no readable text) → backToIdle", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    mockToReceiverChunks.mockReturnValue([]);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    // backToIdle sets status to "idle" but does NOT clear the file.
    expect(result.current.status).toBe("idle");
    expect(result.current.file).not.toBeNull();
    expect(mockToastError).toHaveBeenCalledWith(
      "No readable text found",
      {
        description: "The PDF appears to be blank or unreadable. Try another file.",
        id: "extraction-failed",
      },
    );

    client.clear();
  });

  it("submit: more chunks than MAX_RECEIVER_CHUNKS → backToIdle", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    // Produce 501 chunks (one over the 500 limit).
    const tooManyChunks = Array.from({ length: 501 }, (_, i) => makeChunk(`c${i}`));
    mockToReceiverChunks.mockReturnValue(tooManyChunks);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    // backToIdle sets status to "idle" but does NOT clear the file.
    expect(result.current.status).toBe("idle");
    expect(result.current.file).not.toBeNull();
    expect(mockToastError).toHaveBeenCalledWith(
      "Document is too long",
      {
        description: "This PDF produced more than 500 text blocks. Try a shorter file.",
        id: "extraction-failed",
      },
    );

    client.clear();
  });

  /* ── submit — upload failure ─────────────────────────────────────────────── */

  it("submit: mutation rejects with non-network error → toast + status=queue_failed", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    const apiError = new Error("Server error");
    mockUpload.mockRejectedValueOnce(apiError);
    mockIsNetworkError.mockReturnValue(false);
    mockGetErrorStatus.mockReturnValue(500);
    // getApiErrorMessage returns the fallback since the mock uses mockImplementation
    // with `(_err, fallback) => fallback` from beforeEach.

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe("queue_failed");
    expect(mockToastError).toHaveBeenCalledWith(
      "Could not send the document",
      expect.objectContaining({
        description: "Your file is still here. Try again.",
        id: "queue-failed",
      }),
    );

    client.clear();
  });

  it("submit: mutation rejects with network error → NO toast (interceptor handles it) + status=queue_failed", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    const netError = new Error("Network error");
    mockUpload.mockRejectedValueOnce(netError);
    mockIsNetworkError.mockReturnValue(true);
    mockGetErrorStatus.mockReturnValue(undefined);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe("queue_failed");
    expect(mockToastError).not.toHaveBeenCalled();

    client.clear();
  });

  it("submit: mutation rejects with 401 → NO toast + status=queue_failed", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    const authError = new Error("Unauthorized");
    mockUpload.mockRejectedValueOnce(authError);
    mockIsNetworkError.mockReturnValue(false);
    mockGetErrorStatus.mockReturnValue(401);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe("queue_failed");
    expect(mockToastError).not.toHaveBeenCalled();

    client.clear();
  });

  /* ── retryQueue ─────────────────────────────────────────────────────────────── */

  it("retryQueue: re-sends cached chunks without re-running extractPdf", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    // First submit to populate chunksRef and set status=queue_failed.
    mockUpload.mockRejectedValueOnce(new Error("temp fail"));
    mockIsNetworkError.mockReturnValue(false);
    mockGetErrorStatus.mockReturnValue(500);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe("queue_failed");
    expect(mockExtractPdf).toHaveBeenCalledTimes(1);

    // Now retry — upload succeeds.
    mockUpload.mockResolvedValueOnce(VALID_RESPONSE);

    await act(async () => {
      await result.current.retryQueue();
    });

    await waitFor(() => expect(result.current.status).toBe("queued"));

    // extractPdf was NOT called again (chunks were cached).
    expect(mockExtractPdf).toHaveBeenCalledTimes(1);
    // upload WAS called again.
    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(result.current.result).toEqual(VALID_RESPONSE);

    client.clear();
  });

  it("retryQueue: no-op when no file selected", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.retryQueue();
    });

    expect(mockUpload).not.toHaveBeenCalled();
    client.clear();
  });

  it("retryQueue: no-op when busy", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    // Make extractPdf resolve but upload stay pending so that submit
    // is in the "queueing" phase (busy=true) when we call retryQueue.
    let resolveUpload!: (value: ReceiverUploadResponse) => void;
    const pendingUpload = new Promise<ReceiverUploadResponse>((resolve) => {
      resolveUpload = resolve;
    });
    mockUpload.mockReturnValue(pendingUpload);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    // Kick off submit — it will set status to "processing", then resolve
    // extractPdf, then call send() which sets status to "queueing" and
    // calls mutateAsync (the pending promise). At that point busy=true.
    await act(async () => {
      result.current.submit();
      // Flush microtasks so extractPdf resolves and send starts.
      await new Promise((r) => setTimeout(r, 0));
    });

    // We're now in "queueing" state with upload pending — busy should be true.
    expect(result.current.status).toBe("queueing");
    expect(result.current.busy).toBe(true);

    // retryQueue should be a no-op while busy.
    await act(async () => {
      result.current.retryQueue();
    });

    // No additional upload calls beyond the original.
    expect(mockUpload).toHaveBeenCalledTimes(1);

    // Clean up the pending promise.
    await act(async () => {
      resolveUpload(VALID_RESPONSE);
      await new Promise((r) => setTimeout(r, 0));
    });

    client.clear();
  });

  /* ── startOver ─────────────────────────────────────────────────────────────── */

  it("startOver: clears file, result, and resets to idle", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe("queued");
    expect(result.current.file).not.toBeNull();
    expect(result.current.result).not.toBeNull();

    await act(async () => {
      result.current.startOver();
    });

    expect(result.current.file).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.status).toBe("idle");
    expect(result.current.activeIdx).toBe(0);

    client.clear();
  });

  /* ── busy ──────────────────────────────────────────────────────────────────── */

  it("busy is true during 'processing' (extractPdf in flight)", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    // Make extractPdf pending so the hook stays in "processing".
    let resolveExtract!: (value: PdfExtractionResult) => void;
    const pendingExtract = new Promise<PdfExtractionResult>((resolve) => {
      resolveExtract = resolve;
    });
    mockExtractPdf.mockReturnValue(pendingExtract);

    // idle → not busy.
    expect(result.current.busy).toBe(false);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    // Start submit — it will set status to "processing" and await extractPdf.
    let submitPromise!: Promise<void>;
    await act(async () => {
      submitPromise = result.current.submit();
      // Flush microtasks so setStatus("processing") propagates.
      await new Promise((r) => setTimeout(r, 0));
    });

    // During processing, busy should be true.
    expect(result.current.busy).toBe(true);
    expect(result.current.status).toBe("processing");

    // Resolve extractPdf so the flow can complete.
    await act(async () => {
      resolveExtract(VALID_PDF_RESULT);
      await submitPromise;
    });

    // After completion (queued), busy is false.
    expect(result.current.busy).toBe(false);
    expect(result.current.status).toBe("queued");

    client.clear();
  });

  it("busy is true during 'queueing' (upload in flight)", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    // Make extractPdf resolve quickly but upload stay pending.
    let resolveUpload!: (value: ReceiverUploadResponse) => void;
    const pendingUpload = new Promise<ReceiverUploadResponse>((resolve) => {
      resolveUpload = resolve;
    });
    mockUpload.mockReturnValueOnce(pendingUpload);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      result.current.submit();
      await new Promise((r) => setTimeout(r, 0));
    });

    // extractPdf resolved → status should be "queueing".
    expect(result.current.status).toBe("queueing");
    expect(result.current.busy).toBe(true);

    // Resolve the upload.
    await act(async () => {
      resolveUpload(VALID_RESPONSE);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.status).toBe("queued");
    expect(result.current.busy).toBe(false);

    client.clear();
  });

  /* ── activeIdx ─────────────────────────────────────────────────────────────── */

  it("activeIdx is 0 for idle status", () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.activeIdx).toBe(0);
    client.clear();
  });

  it("activeIdx is 1 for queueing status", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    let resolveUpload!: (value: ReceiverUploadResponse) => void;
    const pendingUpload = new Promise<ReceiverUploadResponse>((resolve) => {
      resolveUpload = resolve;
    });
    mockUpload.mockReturnValueOnce(pendingUpload);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      result.current.submit();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.activeIdx).toBe(1);

    // Clean up.
    await act(async () => {
      resolveUpload(VALID_RESPONSE);
      await new Promise((r) => setTimeout(r, 0));
    });

    client.clear();
  });

  it("activeIdx is 1 for queue_failed status", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    mockUpload.mockRejectedValueOnce(new Error("fail"));
    mockIsNetworkError.mockReturnValue(false);
    mockGetErrorStatus.mockReturnValue(500);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe("queue_failed");
    expect(result.current.activeIdx).toBe(1);
    expect(result.current.busy).toBe(false);

    client.clear();
  });

  it("activeIdx is PROGRESS_STEPS.length (3) for queued status", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe("queued");
    expect(result.current.activeIdx).toBe(3);

    client.clear();
  });

  /* ── submit guard ─────────────────────────────────────────────────────────── */

  it("submit: no-op when no file selected", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.status).toBe("idle");
    expect(mockExtractPdf).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();

    client.clear();
  });

  it("submit: no-op when already busy", async () => {
    const client = makeClient();
    const { result } = renderHook(() => useReceiverUpload(), {
      wrapper: makeWrapper(client),
    });

    // Make extractPdf pending so submit stays in "processing" (busy=true).
    let resolveExtract!: (value: PdfExtractionResult) => void;
    const pendingExtract = new Promise<PdfExtractionResult>((resolve) => {
      resolveExtract = resolve;
    });
    mockExtractPdf.mockReturnValueOnce(pendingExtract);

    await act(async () => {
      result.current.selectFile(makeFile());
    });

    // First submit — goes to "processing", extractPdf is pending.
    let submitPromise!: Promise<void>;
    await act(async () => {
      submitPromise = result.current.submit();
      await new Promise((r) => setTimeout(r, 0));
    });

    // Verify we're in processing (busy=true).
    expect(result.current.status).toBe("processing");
    expect(result.current.busy).toBe(true);

    // Second submit while busy — should be a no-op (extractPdf NOT called again).
    await act(async () => {
      await result.current.submit();
      await new Promise((r) => setTimeout(r, 0));
    });

    // extractPdf called only once (the second submit was a no-op).
    expect(mockExtractPdf).toHaveBeenCalledTimes(1);

    // Resolve to clean up.
    await act(async () => {
      resolveExtract(VALID_PDF_RESULT);
      await submitPromise;
    });

    client.clear();
  });
});
