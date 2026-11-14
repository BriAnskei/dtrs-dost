import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../../../../../../lib/api-error";
import type { IncomingDocumentAssignment } from "../../../detials-page/assignment/types/incoming-document-assignment";
import { useStartIncomingDocumentAssignment } from "./api/use-start-incoming-document-assignment";

/** Only pending notices can be started (PENDING -> ONGOING). */
export function canStartInDivision(a: IncomingDocumentAssignment) {
  return a.status === "PENDING";
}

interface UseDivisionStartAssignmentOptions {
  incomingDocumentId: string;
  /** The rows currently in the list. Used to find the row again after it starts. */
  items: IncomingDocumentAssignment[];
  /** The scrollable list container. Focus falls back to it if the row is gone. */
  listRef: RefObject<HTMLElement | null>;
}

/**
 * The "Start notice" flow for the division tab:
 *
 *   request(row) -> confirm modal opens -> confirm() -> mutation -> modal closes
 *
 * Owns the modal target, the in-flight state, the error message and focus
 * handling, so the tab hook only has to pass the result through.
 *
 * Focus:
 * - cancel: back to the Start button that opened the modal.
 * - success: that Start button disappears (the row is now ONGOING), so focus
 *   moves to the same row's "Submit action" button, the next step. If the row
 *   dropped out of the list (e.g. the Pending filter is on), focus goes to
 *   the list itself.
 *
 * Errors:
 * On failure the modal stays open and shows `errorMessage` inline (no toast),
 * so the user can read it and retry. The error is cleared when the modal
 * opens, closes, or a new attempt starts.
 */
export function useDivisionStartAssignment({
  incomingDocumentId,
  items,
  listRef,
}: UseDivisionStartAssignmentOptions) {
  // The assignment shown in the confirm modal. `null` = modal closed.
  const [target, setTarget] = useState<IncomingDocumentAssignment | null>(null);
  // Row that was just started and is waiting for focus once the list refreshes.
  const [startedId, setStartedId] = useState<string | null>(null);
  // The Start button that opened the modal, so focus can go back to it.
  const triggerRef = useRef<HTMLElement | null>(null);

  const { mutate, isPending, error, reset } = useStartIncomingDocumentAssignment();

  // Message from the last failed attempt, or null.
  const errorMessage = error ? getApiErrorMessage(error) : null;

  const request = useCallback(
    (assignment: IncomingDocumentAssignment) => {
      if (!canStartInDivision(assignment)) return;
      reset(); // don't show a stale error from a previous attempt
      triggerRef.current = document.activeElement as HTMLElement | null;
      setTarget(assignment);
    },
    [reset],
  );

  const cancel = useCallback(() => {
    if (isPending) return;
    setTarget(null);
    reset();
    triggerRef.current?.focus();
  }, [isPending, reset]);

  const confirm = useCallback(() => {
    if (!target || isPending) return;
    const { id } = target;
    // Calling mutate() again clears the previous error, so retry just works.
    mutate(
      { assignmentId: id, incomingDocumentId },
      {
        // The mutation hook's own onSuccess already invalidates the queries
        // and shows the success toast.
        onSuccess: () => {
          setTarget(null);
          setStartedId(id);
        },
      },
    );
  }, [target, isPending, mutate, incomingDocumentId]);

  // Hand focus to the next step once the refreshed list shows the row as ONGOING.
  useEffect(() => {
    if (!startedId) return;
    const row = items.find((a) => a.id === startedId);
    if (row?.status === "PENDING") return; // list hasn't refreshed yet; wait

    const next = row
      ? listRef.current?.querySelector<HTMLElement>(
          `[data-respond-trigger="${startedId}"]`,
        )
      : null;
    (next ?? listRef.current)?.focus();
    setStartedId(null);
  }, [startedId, items, listRef]);

  return { target, isPending, errorMessage, request, cancel, confirm };
}
