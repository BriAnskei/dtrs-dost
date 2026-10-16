import { type ComponentProps, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { buildOutgoingDraft } from "../../helpers/outgoing-helpers";
import type { ExtractionOutcome, FieldKey } from "../../types/extraction-types";
import type SaveOutgoingModal from "../components/modal/SaveOutgoingModal";
import { useCreateOutgoingDocument } from "./api/use-create-outgoing-document";

const OUTGOING_LIST_PATH = "/outgoing";

interface Options {
  /** Only true when the wizard is on the "outgoing" direction. */
  enabled: boolean;
  file: File | null;
  outcome: ExtractionOutcome | null;
  edits: Partial<Record<FieldKey, string>>;
  /** Resets the wizard. Called when the user leaves the success state. */
  onSaved: () => void;
}


export function useOutgoingSave({ enabled, file, outcome, edits, onSaved }: Options) {
  const navigate = useNavigate();
  const createOutgoing = useCreateOutgoingDocument();
  const [isOpen, setIsOpen] = useState(false);
  // Set once the server has created the document. Switches the modal to its success view.
  const [savedCode, setSavedCode] = useState<string | null>(null);

  const draft = useMemo(
    () => (enabled && outcome ? buildOutgoingDraft(outcome.rows, edits) : null),
    [enabled, outcome, edits],
  );

  /** Reasons Save is blocked (empty = ready). */
  const issues = draft?.issues ?? [];

  const open = useCallback(() => {
    if (draft && draft.issues.length === 0) setIsOpen(true);
  }, [draft]);

  /** Dismiss before saving: keeps the review step intact. */
  const cancel = useCallback(() => setIsOpen(false), []);

  const confirm = useCallback(
    (received: { dateReceived: string; receivedBy: string }) => {
      // `savedCode` guard: the document already exists, never create it twice.
      if (!file || !draft || draft.issues.length > 0 || savedCode) return;

      createOutgoing.mutate(
        {
          file,
          dto: {
            subject: draft.subject,
            to: draft.to,
            summary: draft.summary,
            date_prepared: draft.datePrepared,
            date_received: received.dateReceived,
            received_by: received.receivedBy,
          },
        },
        {
          // The mutation hook already toasts on error and invalidates the list.
          // On error the modal stays open for a retry.
          onSuccess: (result) => setSavedCode(result.code),
        },
      );
    },
    [file, draft, savedCode, createOutgoing],
  );

  /** Leave the success state and start a fresh upload. */
  const saveAnother = useCallback(() => {
    setIsOpen(false);
    setSavedCode(null);
    onSaved();
  }, [onSaved]);

  /** Leave the success state and go to the outgoing list. */
  const goToOutgoing = useCallback(() => {
    setIsOpen(false);
    setSavedCode(null);
    onSaved();
    navigate(OUTGOING_LIST_PATH);
  }, [onSaved, navigate]);

  /** Spread onto <SaveOutgoingModal />; null while the modal should be closed. */
  const modalProps: ComponentProps<typeof SaveOutgoingModal> | null =
    isOpen && draft
      ? {
          draft,
          editedCount: Object.keys(edits).length,
          isSaving: createOutgoing.isPending,
          savedCode,
          onCancel: cancel,
          onConfirm: confirm,
          onSaveAnother: saveAnother,
          onGoToOutgoing: goToOutgoing,
        }
      : null;

  return { issues, open, modalProps };
}
