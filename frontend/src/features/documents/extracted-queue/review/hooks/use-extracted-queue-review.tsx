import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import type { FieldKey } from "../../../extraction/types/extraction-types";
import { useExtractedQueueDetail } from "./api/use-extracted-queue-detial";

const QUEUE_PATH = "/extracted-queues";

export type ReviewModal = "save" | "invalidate" | null;

export function useExtractedQueueReview(id: string) {
  const navigate = useNavigate();
  const { detail, file, outcome, isLoading, isError } = useExtractedQueueDetail(id);

  // Reviewer edits, keyed by field. A key is present only if the field was edited.
  const [edits, setEdits] = useState<Partial<Record<FieldKey, string>>>({});
  const [modal, setModal] = useState<ReviewModal>(null);

  /** string = set the edited value, null = revert the field to the extracted value. */
  const handleEdit = useCallback((field: FieldKey, value: string | null) => {
    setEdits((prev) => {
      const next = { ...prev };
      if (value === null) delete next[field];
      else next[field] = value;
      return next;
    });
  }, []);

  const hasEdits = Object.keys(edits).length > 0;

  const openSaveModal = useCallback(() => setModal("save"), []);
  const openInvalidateModal = useCallback(() => setModal("invalidate"), []);
  const closeModal = useCallback(() => setModal(null), []);

  const handleSaveConfirm = useCallback(() => {
    // TODO: save the document (with `edits`) so it proceeds as an incoming document.
    setModal(null);
  }, []);

  // The document is no longer reviewable once invalidated, so leave the page.
  const handleInvalidated = useCallback(() => {
    setModal(null);
    navigate(QUEUE_PATH, { replace: true });
  }, [navigate]);

  return {
    detail,
    file,
    outcome,
    isLoading,
    isError,
    edits,
    hasEdits,
    handleEdit,
    isSaveModalOpen: modal === "save",
    isInvalidateModalOpen: modal === "invalidate",
    openSaveModal,
    openInvalidateModal,
    closeModal,
    handleSaveConfirm,
    handleInvalidated,
  };
}
