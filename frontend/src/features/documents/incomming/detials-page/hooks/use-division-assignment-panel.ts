import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { DivisionNoticeOfAction } from "../../types/assign-incoming-document-to-dto-division.type";
import type { AssignedDivisionNoticeCount } from "../../types/assigned-division-notice-count-response";
import type {
  RoutedDivisionAssignment,
  Status,
} from "../../types/routed-division-assignments.type";
import { useIncomingDocumentAssignmentsByRoutingId } from "./api/use-incoming-document-assignments-by-routing-id";
import { useNoticeDrafts } from "./use-notice-drafts";

/** How long a deleted pending notice can be restored before the delete is sent. */
const UNDO_MS = 5000;

/** Pending first, then ongoing, then complete. */
const STATUS_ORDER: Record<Status, number> = {
  PENDING: 0,
  ONGOING: 1,
  COMPLETE: 2,
};

/** An action is only recorded once the notice is complete. */
export const isActionTaken = (a: RoutedDivisionAssignment) => a.status === "COMPLETE";

/** Only pending notices can be undone; ongoing and complete ones ask first. */
export const needsConfirmToDelete = (a: RoutedDivisionAssignment) =>
  a.status !== "PENDING";

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
  onClose: () => void;
  /** Resolve `true` when the notices were saved, `false` to keep the form open. */
  onAddAssignments: (
    routingId: string,
    notices: DivisionNoticeOfAction[],
  ) => Promise<boolean>;
  /** Resolve `true` when the assignment was deleted, `false` to restore it in the list. */
  onRemoveAssignment: (routingId: string, assignmentId: string) => Promise<boolean>;
}

export function useDivisionAssignmentsPanel({
  row,
  onClose,
  onAddAssignments,
  onRemoveAssignment,
}: UseDivisionAssignmentsPanelArgs) {
  // Keep the last row while the panel slides out, so the title doesn't blank.
  const [shown, setShown] = useState(row);
  if (row && row !== shown) setShown(row);

  const query = useIncomingDocumentAssignmentsByRoutingId(shown?.routing_id ?? "");
  const drafts = useNoticeDrafts();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  // Pending notices that were "deleted" but can still be undone.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const pendingDeletes = useRef(new Map<string, { timer: number; routingId: string }>());

  // If the panel unmounts mid-undo-window, send the deletes now rather than lose them.
  const removeRef = useRef(onRemoveAssignment);
  useEffect(() => {
    removeRef.current = onRemoveAssignment;
  }, [onRemoveAssignment]);
  useEffect(() => {
    const pending = pendingDeletes.current;
    return () => {
      pending.forEach(({ timer, routingId }, id) => {
        window.clearTimeout(timer);
        void removeRef.current(routingId, id);
      });
      pending.clear();
    };
  }, []);

  const items = useMemo(
    () =>
      (query.data ?? []).filter((a) => !hiddenIds.has(a.id)).sort(byStatusThenCreated),
    [query.data, hiddenIds],
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

  const unhide = (id: string) =>
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  /** Pending notice: remove from the list now, send the delete after the undo window. */
  const scheduleDelete = (assignment: RoutedDivisionAssignment) => {
    if (!shown) return;
    const routingId = shown.routing_id;
    const { id } = assignment;

    setHiddenIds((prev) => new Set(prev).add(id));

    const timer = window.setTimeout(async () => {
      pendingDeletes.current.delete(id);
      const deleted = await onRemoveAssignment(routingId, id);
      if (!deleted) unhide(id); // failed or not supported yet: put it back
    }, UNDO_MS);
    pendingDeletes.current.set(id, { timer, routingId });

    toast("Notice of action deleted", {
      description: assignment.notice_of_action,
      duration: UNDO_MS,
      action: {
        label: "Undo",
        onClick: () => {
          window.clearTimeout(timer);
          pendingDeletes.current.delete(id);
          unhide(id);
        },
      },
    });
  };

  /** Ongoing or complete notice: ask first. */
  const confirmDelete = async (assignment: RoutedDivisionAssignment) => {
    if (!shown) return;
    setBusyId(assignment.id);
    try {
      await onRemoveAssignment(shown.routing_id, assignment.id);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const requestDelete = (assignment: RoutedDivisionAssignment) => {
    if (needsConfirmToDelete(assignment)) setConfirmId(assignment.id);
    else scheduleDelete(assignment);
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
