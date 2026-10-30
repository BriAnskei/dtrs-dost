import { useCallback, useState } from "react";
import { getApiErrorMessage, isNetworkError } from "../../../../../lib/api-error";
import type { DivisionName } from "../../../../user-management/types/division-name.type";
import { MAX_NOTICES, useNoticeDrafts } from "../../detials-page/hooks/use-notice-drafts";
import { useAssignIncomingDocumentToDivision } from "./api/use-assign-incoming-document-to-division";

// Re-exported so existing imports keep working.
export { MAX_NOTICES };

interface Options {
  incomingDocumentId: string | undefined;
  onClose: () => void;
}

/**
 * Form state for the Assign Division modal. The modal is mounted only while
 * open, so all state here resets automatically on every open.
 */
export function useAssignDivisionModal({ incomingDocumentId, onClose }: Options) {
  const mutation = useAssignIncomingDocumentToDivision();
  const { reset: resetMutation, isError, error } = mutation;

  const [division, setDivision] = useState<DivisionName | null>(null);
  // Errors stay hidden until the first submit attempt, then update live.
  const [submitted, setSubmitted] = useState(false);

  // Message shown in the modal. Network failures get their own wording since
  // getApiErrorMessage would just return the generic fallback for them.
  const submitError = isError
    ? isNetworkError(error)
      ? "Can't reach the server. Check your connection and try again."
      : getApiErrorMessage(error, "Failed to assign division.")
    : null;

  // Any edit invalidates the last server error (e.g. "already routed" no
  // longer applies once another division is picked).
  const clearSubmitError = useCallback(() => {
    if (isError) resetMutation();
  }, [isError, resetMutation]);

  // Notices are optional as a section, so the form starts with none.
  const drafts = useNoticeDrafts({ onEdit: clearSubmitError });

  const selectDivision = useCallback(
    (next: DivisionName | null) => {
      clearSubmitError();
      setDivision(next);
    },
    [clearSubmitError],
  );

  const divisionError = !division
    ? "Select a division to assign this document to."
    : null;

  const submit = () => {
    setSubmitted(true);
    // Also reveals row errors, even when the division is still missing.
    const noticesOfAction = drafts.validate();
    if (!incomingDocumentId || !division || !noticesOfAction) return;

    mutation.mutate(
      { incomingDocumentId, divisionId: division.id, noticesOfAction },
      { onSuccess: onClose }, // the hook-level onSuccess already toasts + invalidates
    );
  };

  return {
    division,
    setDivision: selectDivision,
    divisionError: submitted ? divisionError : null,
    notices: drafts.notices,
    noticeErrors: drafts.noticeErrors,
    lastAddedKey: drafts.lastAddedKey,
    canAddNotice: drafts.canAdd,
    addNotice: drafts.add,
    updateNotice: drafts.update,
    removeNotice: drafts.remove,
    submit,
    isSubmitting: mutation.isPending,
    submitError,
    dismissSubmitError: resetMutation,
  };
}
