import { useDeleteIncomingDocumentAssignment } from "../../../shared/hooks/api/use-delete-incoming-document-assignment";
import type { IncomingDocumentAssignment } from "../types/incoming-document-assignment";

interface UseDeleteAssignmentModalArgs {
  incomingDocumentId: string;
  assignment: IncomingDocumentAssignment;
  /** Cancel / dismiss. */
  onClose: () => void;
  /** Fires after a successful delete. */
  onDeleted: () => void;
}

/**
 * State for the "Delete notice of action" modal.
 * Only PENDING and ONGOING notices can be deleted; COMPLETE ones are blocked
 * here as well as in the row button, in case the data went stale while the
 * modal was open.
 */
export function useDeleteAssignmentModal({
  incomingDocumentId,
  assignment,
  onClose,
  onDeleted,
}: UseDeleteAssignmentModalArgs) {
  const { mutateAsync: deleteAssignment, isPending } =
    useDeleteIncomingDocumentAssignment();

  const canDelete = assignment.status !== "COMPLETE";

  const requestClose = () => {
    if (isPending) return;
    onClose();
  };

  const submit = async () => {
    if (isPending || !canDelete) return;
    try {
      await deleteAssignment({
        incomingDocumentId,
        assignmentId: assignment.id,
      });
      onDeleted();
    } catch {
      // The mutation's onError already toasts. Stay open so the user can retry or cancel.
    }
  };

  return {
    canDelete,
    isSubmitting: isPending,
    requestClose,
    submit,
  };
}
