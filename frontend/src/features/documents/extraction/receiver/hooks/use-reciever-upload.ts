import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useExtraction } from "../../hooks/use-extraction";
import type { ExtractionOutcome } from "../../types/extraction-types";
import { PROGRESS_STEPS } from "../receiver-upload-constants";

export type ReceiverUploadStatus =
  | "idle"
  | "processing"
  | "queueing"
  | "queue_failed"
  | "queued";

/**
 * Receiver flow: pick file -> browser extraction -> auto-queue for admin validation.
 * No review step. REVIEW / INVALID decisions are queued as-is; the admin handles them.
 */
export function useReceiverUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ReceiverUploadStatus>("idle");
  // Receivers only handle incoming documents.
  const { phase, outcome, start, reset } = useExtraction("incoming");

  const mountedRef = useRef(true);
  // Guards against queueing the same outcome twice (StrictMode / re-renders).
  const queuedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const busy = status === "processing" || status === "queueing";

  // Extraction runs in this browser: warn before the tab is closed mid-way.
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  const queue = useCallback(async (f: File, o: ExtractionOutcome) => {
    setStatus("queueing");
    try {
      if (!mountedRef.current) return;
      setStatus("queued");
    } catch {
      if (!mountedRef.current) return;
      queuedRef.current = false;
      setStatus("queue_failed");
      toast.error("Could not send the document", {
        description: "Your file is still here. Try again.",
        id: "queue-failed",
      });
    }
  }, []);

  // As soon as extraction finishes, queue the result.
  useEffect(() => {
    if (status !== "processing" || phase !== "done" || !outcome || !file) return;
    if (queuedRef.current) return;
    queuedRef.current = true;
    void queue(file, outcome);
  }, [status, phase, outcome, file, queue]);

  const selectFile = useCallback(
    (f: File | null) => {
      reset();
      setFile(f);
    },
    [reset],
  );

  const submit = useCallback(async () => {
    if (!file) return;
    queuedRef.current = false;
    setStatus("processing");
    const result = await start(file);

    if (result.ok || !mountedRef.current) return;

    // Unexpected failure: back to the file card so the user can retry or swap the file.
    reset();
    setStatus("idle");
    if (!result.silent) {
      toast.error(result.title, {
        description: result.description,
        id: "extraction-failed",
      });
    }
  }, [file, start, reset]);

  /** Re-sends the already extracted outcome; does not redo the extraction. */
  const retryQueue = useCallback(() => {
    if (!file || !outcome || queuedRef.current) return;
    queuedRef.current = true;
    void queue(file, outcome);
  }, [file, outcome, queue]);

  const startOver = useCallback(() => {
    reset();
    queuedRef.current = false;
    setFile(null);
    setStatus("idle");
  }, [reset]);

  // Index of the step currently in progress (PROGRESS_STEPS.length = all done).
  const activeIdx =
    status === "queued"
      ? PROGRESS_STEPS.length
      : status === "queueing" || status === "queue_failed"
        ? 2
        : phase === "llm" || phase === "done"
          ? 1
          : 0;

  return { file, status, busy, activeIdx, selectFile, submit, retryQueue, startOver };
}
