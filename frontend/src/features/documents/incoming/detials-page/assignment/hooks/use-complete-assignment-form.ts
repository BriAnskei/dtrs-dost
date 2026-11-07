import { useState } from "react";
import { useCompleteIncomingDocumentAssignment } from "../../../shared/hooks/api/use-complete-incoming-document-assignment";
import type { IncomingDocumentAssignment } from "../types/incoming-document-assignment";

export const ACTION_TAKEN_MIN = 3;
export const ACTION_TAKEN_MAX = 500;

interface UseCompleteAssignmentFormArgs {
  incomingDocumentId: string;
  assignment: IncomingDocumentAssignment;
  /** Fires after a successful completion. */
  onCompleted: () => void;
}

/**
 * State for the inline "Record action taken" panel on a notice row.
 *
 * Only MAIN notices that are ONGOING can be completed from here. DIVISION
 * notices are completed by their division handler. The guard is repeated in
 * `submit` in case the row went stale while the panel was open.
 *
 * The panel mounts only while open, so closing it drops the draft.
 */
export function useCompleteAssignmentForm({
  incomingDocumentId,
  assignment,
  onCompleted,
}: UseCompleteAssignmentFormArgs) {
  const [text, setText] = useState("");
  const [showError, setShowError] = useState(false);

  const { mutateAsync: completeAssignment, isPending } =
    useCompleteIncomingDocumentAssignment(incomingDocumentId);

  const canComplete =
    assignment.office_type === "MAIN" && assignment.status === "ONGOING";

  const trimmed = text.trim();
  const validationError =
    trimmed.length === 0
      ? "Describe the action taken."
      : trimmed.length < ACTION_TAKEN_MIN
        ? `Use at least ${ACTION_TAKEN_MIN} characters.`
        : trimmed.length > ACTION_TAKEN_MAX
          ? `Keep it under ${ACTION_TAKEN_MAX} characters.`
          : undefined;

  const change = (value: string) => setText(value);

  const submit = async () => {
    if (isPending || !canComplete) return;
    setShowError(true);
    if (validationError) return;

    try {
      await completeAssignment({
        assignmentId: assignment.id,
        dto: { actionTaken: trimmed },
      });
      onCompleted();
    } catch {
      // The mutation's onError already toasts. Stay open so nothing typed is lost.
    }
  };

  return {
    text,
    change,
    isEmpty: text === "",
    length: text.length,
    error: showError ? validationError : undefined,
    canComplete,
    isSubmitting: isPending,
    submit,
  };
}
