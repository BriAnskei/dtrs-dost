import { useCallback, useState } from "react";
import type { MyExtractedDocumentQueue } from "../types/extracted-queue-receiver-types";
import { useDeleteExtractedDocumentQueue } from "./api/use-delete-extracted-document-queue";

interface Options {
  /** Runs after a successful delete (the mutation's toast and cache update run first). */
  onDeleted?: () => void;
}

export function useDeleteQueueModal({ onDeleted }: Options = {}) {
  const [target, setTarget] = useState<MyExtractedDocumentQueue | null>(null);
  const { mutate, isPending } = useDeleteExtractedDocumentQueue();

  const open = useCallback((item: MyExtractedDocumentQueue) => setTarget(item), []);

  const close = useCallback(() => {
    if (!isPending) setTarget(null);
  }, [isPending]);

  const confirm = useCallback(() => {
    if (!target) return;

    mutate(target.id, {
      onSuccess: () => {
        setTarget(null);
        onDeleted?.();
      },
    });
  }, [target, mutate, onDeleted]);

  return {
    target,
    isOpen: target !== null,
    isDeleting: isPending,
    open,
    close,
    confirm,
  };
}
