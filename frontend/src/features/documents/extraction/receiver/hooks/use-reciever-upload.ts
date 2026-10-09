import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getApiErrorMessage,
  getErrorStatus,
  isNetworkError,
} from "../../../../../lib/api-error";
import { extractPdf } from "../../pdf";
import { MAX_RECEIVER_CHUNKS, toReceiverChunks } from "../helpers/reciver-upload-chunks";
import { PROGRESS_STEPS } from "../receiver-upload-constants";
import { receiverUploadService } from "../service/reciever-upload-service";
import type {
  ReceiverChunk,
  ReceiverUploadResponse,
} from "../types/reciever-upload-api-types";

export type ReceiverUploadStatus =
  | "idle"
  | "processing" // browser: pdf.js + OCR
  | "queueing" // request in flight (LLM extraction + save happen server-side)
  | "queue_failed"
  | "queued";

export function useReceiverUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ReceiverUploadStatus>("idle");
  // Server response (decision + per-field confidence) shown after a successful upload.
  const [result, setResult] = useState<ReceiverUploadResponse | null>(null);

  const { mutateAsync, reset: resetMutation } = useMutation({
    mutationFn: receiverUploadService.upload,
  });

  const mountedRef = useRef(true);
  // Kept so Retry re-sends without redoing OCR.
  const chunksRef = useRef<ReceiverChunk[] | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const busy = status === "processing" || status === "queueing";

  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();

      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  const send = useCallback(
    async (f: File, chunks: ReceiverChunk[]) => {
      setStatus("queueing");
      try {
        const data = await mutateAsync({ file: f, chunks });
        if (!mountedRef.current) return;

        setResult(data);
        setStatus("queued");
      } catch (err) {
        if (!mountedRef.current) return;
        setStatus("queue_failed");
        // The Axios interceptor already toasts network errors and expired sessions.
        if (!isNetworkError(err) && getErrorStatus(err) !== 401) {
          toast.error("Could not send the document", {
            description: getApiErrorMessage(err, "Your file is still here. Try again."),
            id: "queue-failed",
          });
        }
        console.log(getApiErrorMessage(err, "Failed"));
      }
    },
    [mutateAsync],
  );

  const backToIdle = useCallback((title: string, description: string) => {
    setStatus("idle");
    toast.error(title, { description, id: "extraction-failed" });
  }, []);

  const selectFile = useCallback(
    (f: File | null) => {
      chunksRef.current = null;
      resetMutation();
      setResult(null);
      setFile(f);
    },
    [resetMutation],
  );

  const submit = useCallback(async () => {
    if (!file || busy) return;
    setStatus("processing");

    let chunks: ReceiverChunk[];
    try {
      chunks = toReceiverChunks(await extractPdf(file));
    } catch {
      if (!mountedRef.current) return;
      return backToIdle(
        "Could not read this PDF",
        "The file may be corrupted or protected. Try another file.",
      );
    }
    if (!mountedRef.current) return;

    if (chunks.length === 0) {
      return backToIdle(
        "No readable text found",
        "The PDF appears to be blank or unreadable. Try another file.",
      );
    }
    if (chunks.length > MAX_RECEIVER_CHUNKS) {
      return backToIdle(
        "Document is too long",
        `This PDF produced more than ${MAX_RECEIVER_CHUNKS} text blocks. Try a shorter file.`,
      );
    }

    chunksRef.current = chunks;
    await send(file, chunks);
  }, [file, busy, send, backToIdle]);

  /** Re-sends the already-read chunks; does not redo OCR. */
  const retryQueue = useCallback(() => {
    if (!file || !chunksRef.current || busy) return;
    void send(file, chunksRef.current);
  }, [file, busy, send]);

  const startOver = useCallback(() => {
    chunksRef.current = null;
    resetMutation();
    setResult(null);
    setFile(null);
    setStatus("idle");
  }, [resetMutation]);

  const activeIdx =
    status === "queued"
      ? PROGRESS_STEPS.length
      : status === "queueing" || status === "queue_failed"
        ? 1
        : 0;

  return {
    file,
    status,
    busy,
    activeIdx,
    result,
    selectFile,
    submit,
    retryQueue,
    startOver,
  };
}
