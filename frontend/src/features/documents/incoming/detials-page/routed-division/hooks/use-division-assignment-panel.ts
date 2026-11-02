import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { OfficeType } from "../../../enum/office-type.enum";
import { useNoticeDrafts } from "../../../shared/hooks/use-notice-drafts";
import type { AssignedDivisionNoticeCount } from "../../../types/assigned-division-notice-count-response";
import type { AssignmentStatus } from "../../../types/assignment-types";
import type { NoticeOfActionDto } from "../../../types/notice-of-action-dto";
import type { RoutedDivisionAssignment } from "../../../types/routed-division-assignments.type";
import { useCreateIncomingDocumentAssignments } from "./api/use-create-incoming-document-assignments";
import { useDeleteIncomingDocumentAssignment } from "./api/use-delete-incoming-document-assignment";
import { useIncomingDocumentAssignmentsByRoutingId } from "./api/use-incoming-document-assignments-by-routing-id";

/** Pending first, then ongoing, then complete. */
const STATUS_ORDER: Record<AssignmentStatus, number> = {
  PENDING: 0,
  ONGOING: 1,
  COMPLETE: 2,
};

/** An action is only recorded once the notice is complete. */
export const isActionTaken = (a: RoutedDivisionAssignment) => a.status === "COMPLETE";

/** Completed notices have a recorded action, so they can never be deleted. */
export const canDeleteAssignment = (a: RoutedDivisionAssignment) =>
  a.status !== "COMPLETE";

const byStatusThenCreated = (
  a: RoutedDivisionAssignment,
  b: RoutedDivisionAssignment,
) => {
  const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  return diff !== 0 ? diff : a.created_at.localeCompare(b.created_at);
};

interface UseDivisionAssignmentsPanelArgs {
  /** The selected division row. `null` closes the panel. */
  row: AssignedDivisionNoticeCount | null;
  /** The document the division is routed from. */
  incomingDocumentId: string;
  onClose: () => void;
}

export function useDivisionAssignmentsPanel({
  row,
  incomingDocumentId,
  onClose,
}: UseDivisionAssignmentsPanelArgs) {
  // Keep the last row while the panel slides out, so the title doesn't blank.
  const [shown, setShown] = useState(row);
  if (row && row !== shown) setShown(row);

  const query = useIncomingDocumentAssignmentsByRoutingId(shown?.routing_id ?? "");
  const drafts = useNoticeDrafts();
  const { mutateAsync: createAssignments } = useCreateIncomingDocumentAssignments();
  const { mutateAsync: deleteAssignment } = useDeleteIncomingDocumentAssignment();

  /* ------------------------------ API calls ----------------------------- */

  /** Resolves `true` when the notices were saved, `false` to keep the form open. */
  const onAddAssignments = useCallback(
    async (routingId: string, notices: NoticeOfActionDto[]): Promise<boolean> => {
      try {
        await createAssignments({
          incomingDocumentId,
          dto: {
            // This panel only ever manages division routings.
            officeType: OfficeType.DIVISION,
            incomingDocumentRoutingId: routingId,
            noticesOfActions: notices,
          },
        });
        toast.success(
          notices.length === 1
            ? "Notice of action added"
            : `${notices.length} notices of action added`,
        );
        return true;
      } catch {
        toast.error("Couldn't add the notices of action. Please try again.");
        return false; // keep the form open so nothing typed is lost
      }
    },
    [createAssignments, incomingDocumentId],
  );

  /** Resolves `true` when the assignment was deleted, `false` if it failed. */
  const onRemoveAssignment = useCallback(
    async (routingId: string, assignmentId: string): Promise<boolean> => {
      try {
        await deleteAssignment({ incomingDocumentId, assignmentId, routingId });
        return true;
      } catch {
        // The mutation's onError already shows the error toast.
        return false;
      }
    },
    [deleteAssignment, incomingDocumentId],
  );

  /* ------------------------------- state -------------------------------- */

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [discardPrompt, setDiscardPrompt] = useState(false);

  const items = useMemo(
    // Copy before sorting: `query.data` is the React Query cache.
    () => [...(query.data ?? [])].sort(byStatusThenCreated),
    [query.data],
  );
  const takenCount = items.filter(isActionTaken).length;
  const isBusy = isSubmitting || busyId !== null;
  const isFormOpen = drafts.notices.length > 0;

  /* ----------------------------- closing -------------------------------- */

  const finishClose = () => {
    drafts.reset();
    setDiscardPrompt(false);
    setConfirmId(null);
    onClose();
  };

  const requestClose = () => {
    if (drafts.isDirty && !discardPrompt) {
      setDiscardPrompt(true);
      return;
    }
    finishClose();
  };

  const keepEditing = () => setDiscardPrompt(false);

  /* ------------------------------ adding -------------------------------- */

  const submit = async () => {
    if (!shown || isSubmitting) return;
    const payload = drafts.validate();
    if (!payload || payload.length === 0) return;

    setIsSubmitting(true);
    try {
      const saved = await onAddAssignments(shown.routing_id, payload);
      if (saved) drafts.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ----------------------------- deleting ------------------------------- */

  /** Pending or ongoing only: opens the confirmation in the card. */
  const requestDelete = (assignment: RoutedDivisionAssignment) => {
    if (!canDeleteAssignment(assignment)) return;
    setConfirmId(assignment.id);
  };

  /** Sends the delete right away once the user confirms. */
  const confirmDelete = async (assignment: RoutedDivisionAssignment) => {
    if (!shown || !canDeleteAssignment(assignment)) return;
    setBusyId(assignment.id);
    try {
      const deleted = await onRemoveAssignment(shown.routing_id, assignment.id);
      // On failure keep the prompt open so the user can retry or cancel.
      if (deleted) setConfirmId(null);
    } finally {
      setBusyId(null);
    }
  };

  const cancelConfirm = () => setConfirmId(null);

  return {
    shown,
    query,
    drafts,
    items,
    takenCount,
    isBusy,
    isSubmitting,
    isFormOpen,
    confirmId,
    busyId,
    discardPrompt,
    requestClose,
    finishClose,
    keepEditing,
    submit,
    requestDelete,
    confirmDelete,
    cancelConfirm,
  };
}
