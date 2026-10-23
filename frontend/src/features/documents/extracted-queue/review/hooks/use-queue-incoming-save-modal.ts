import { type ComponentProps, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type SaveIncomingModal from "../../../extraction/admins/components/modal/SaveIncomingModel";
import { buildIncomingDraft } from "../../../extraction/helpers/incoming-helpers";
import type {
  ExtractionOutcome,
  FieldKey,
} from "../../../extraction/types/extraction-types";
import { useCreateIncomingFromQueue } from "./api/use-create-incoming-from-queue";

const QUEUE_PATH = "/extracted-queues";
const INCOMING_LIST_PATH = "/incoming";

interface Options {
  /** Id of the extracted-queue item being reviewed. */
  queueId: string;
  outcome: ExtractionOutcome | null;
  edits: Partial<Record<FieldKey, string>>;
}

/**
 * The queue-review "Save" flow: builds the final values from the extraction + edits,
 * creates the incoming document from the queue item (which also approves it
 * server-side), and drives the modal's confirmation -> success states.
 */
export function useQueueIncomingSaveModal({ queueId, outcome, edits }: Options) {
  const navigate = useNavigate();
  const createFromQueue = useCreateIncomingFromQueue();
  const [isOpen, setIsOpen] = useState(false);
  // Set once the server has created the document. Switches the modal to its success view.
  const [savedCode, setSavedCode] = useState<string | null>(null);

  const draft = useMemo(
    () => (outcome ? buildIncomingDraft(outcome.rows, edits) : null),
    [outcome, edits],
  );

  /** Reasons Save is blocked (empty = ready). */
  const issues = draft?.issues ?? [];

  const open = useCallback(() => {
    if (draft && draft.issues.length === 0) setIsOpen(true);
  }, [draft]);

  /** Dismiss before saving: keeps the review step intact. */
  const cancel = useCallback(() => setIsOpen(false), []);

  const confirm = useCallback(() => {
    // `savedCode` guard: the document already exists, never create it twice.
    if (!draft || draft.issues.length > 0 || savedCode) return;

    createFromQueue.mutate(
      {
        queueId,
        dto: {
          subject: draft.subject,
          document_from: draft.documentFrom,
          recipient: draft.recipient,
          date_received: draft.dateReceived,
          summary: draft.summary,
        },
      },
      {
        // The mutation hook already toasts and invalidates the lists.
        // On error the modal stays open for a retry.
        onSuccess: (result) => setSavedCode(result.code),
      },
    );
  }, [draft, savedCode, queueId, createFromQueue]);

  /** The queue item is approved, so leave the review page. */
  const goToQueue = useCallback(() => {
    setIsOpen(false);
    navigate(QUEUE_PATH, { replace: true });
  }, [navigate]);

  const goToIncoming = useCallback(() => {
    setIsOpen(false);
    navigate(INCOMING_LIST_PATH);
  }, [navigate]);

  /** Spread onto <SaveIncomingModal />; null while the modal should be closed. */
  const modalProps: ComponentProps<typeof SaveIncomingModal> | null =
    isOpen && draft
      ? {
          draft,
          editedCount: Object.keys(edits).length,
          isSaving: createFromQueue.isPending,
          savedCode,
          onCancel: cancel,
          onConfirm: confirm,
          // Modal is shared with the upload wizard and is left unchanged. There is no
          // "upload another" here: the queue item is approved, so this returns to the queue.
          onSaveAnother: goToQueue,
          onGoToIncoming: goToIncoming,

          hideSaveAnother: true,
        }
      : null;

  return { issues, open, modalProps };
}
