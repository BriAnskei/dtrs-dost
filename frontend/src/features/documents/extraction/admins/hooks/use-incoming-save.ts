import { type ComponentProps, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { buildIncomingDraft } from "../../helpers/incoming-helpers";
import type { ExtractionOutcome, FieldKey } from "../../types/extraction-types";
import type SaveIncomingModal from "../components/modal/SaveIncomingModel";
import { useCreateIncomingDocument } from "./api/use-create-incoming-document";

const INCOMING_LIST_PATH = "/incoming";

interface Options {
  /** Only true when the wizard is on the "incoming" direction. */
  enabled: boolean;
  file: File | null;
  outcome: ExtractionOutcome | null;
  edits: Partial<Record<FieldKey, string>>;
  /** Resets the wizard. Called when the user leaves the success state. */
  onSaved: () => void;
}

/**
 * Everything the incoming "Save File" flow needs: final values, blockers,
 * the modal's open state, the create call, and the post-save success state
 * (document code + navigation).
 */
export function useIncomingSave({ enabled, file, outcome, edits, onSaved }: Options) {
  const navigate = useNavigate();
  const createIncoming = useCreateIncomingDocument();
  const [isOpen, setIsOpen] = useState(false);
  // Set once the server has created the document. Switches the modal to its success view.
  const [savedCode, setSavedCode] = useState<string | null>(null);

  const draft = useMemo(
    () => (enabled && outcome ? buildIncomingDraft(outcome.rows, edits) : null),
    [enabled, outcome, edits],
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
    if (!file || !draft || draft.issues.length > 0 || savedCode) return;

    createIncoming.mutate(
      {
        file,
        dto: {
          subject: draft.subject,
          document_from: draft.documentFrom,
          recipient: draft.recipient,
          date_received: draft.dateReceived,
          summary: draft.summary,
        },
      },
      {
        // The mutation hook already toasts on error and invalidates the list.
        // On error the modal stays open for a retry.
        onSuccess: (result) => setSavedCode(result.code),
      },
    );
  }, [file, draft, savedCode, createIncoming]);

  /** Leave the success state and start a fresh upload. */
  const saveAnother = useCallback(() => {
    setIsOpen(false);
    setSavedCode(null);
    onSaved();
  }, [onSaved]);

  /** Leave the success state and go to the incoming list. */
  const goToIncoming = useCallback(() => {
    setIsOpen(false);
    setSavedCode(null);
    onSaved();
    navigate(INCOMING_LIST_PATH);
  }, [onSaved, navigate]);

  /** Spread onto <SaveIncomingModal />; null while the modal should be closed. */
  const modalProps: ComponentProps<typeof SaveIncomingModal> | null =
    isOpen && draft
      ? {
          draft,
          editedCount: Object.keys(edits).length,
          isSaving: createIncoming.isPending,
          savedCode,
          onCancel: cancel,
          onConfirm: confirm,
          onSaveAnother: saveAnother,
          onGoToIncoming: goToIncoming,
        }
      : null;

  return { issues, open, modalProps };
}
