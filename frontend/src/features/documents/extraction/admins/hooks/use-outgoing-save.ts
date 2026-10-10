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
  /** Called after a successful save, before navigating (reset the wizard here). */
  onSaved: () => void;
}

/**
 * Everything the outgoing "Save File" flow needs: final values, blockers,
 * the confirm modal's open state, and the create + navigate call.
 */
export function useOutgoingSave({ enabled, file, outcome, edits, onSaved }: Options) {
  const navigate = useNavigate();
  const createOutgoing = useCreateOutgoingDocument();
  const [isOpen, setIsOpen] = useState(false);

  const draft = useMemo(
    () => (enabled && outcome ? buildOutgoingDraft(outcome.rows, edits) : null),
    [enabled, outcome, edits],
  );

  /** Reasons Save is blocked (empty = ready). */
  const issues = draft?.issues ?? [];

  const open = useCallback(() => {
    if (draft && draft.issues.length === 0) setIsOpen(true);
  }, [draft]);

  const close = useCallback(() => setIsOpen(false), []);

  const confirm = useCallback(
    (received: { dateReceived: string; receivedBy: string }) => {
      if (!file || !draft || draft.issues.length > 0) return;

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
          // The mutation hook already toasts + invalidates. On error the modal stays open for a retry.
          onSuccess: () => {
            setIsOpen(false);
            onSaved();
            navigate(OUTGOING_LIST_PATH);
          },
        },
      );
    },
    [file, draft, createOutgoing, onSaved, navigate],
  );

  /** Spread onto <SaveOutgoingModal />; null while the modal should be closed. */
  const modalProps: ComponentProps<typeof SaveOutgoingModal> | null =
    isOpen && draft
      ? {
          draft,
          editedCount: Object.keys(edits).length,
          isSaving: createOutgoing.isPending,
          onCancel: close,
          onConfirm: confirm,
        }
      : null;

  return { issues, open, modalProps };
}
