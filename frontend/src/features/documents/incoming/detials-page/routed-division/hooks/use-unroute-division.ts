import { useRef, useState } from "react";
import type { RoutedDivisionAssignment } from "../../../types/routed-division-assignments.type";
import { useDeleteIncomingDocumentRouting } from "./api/use-delete-incoming-document-routing";

interface UseUnrouteDivisionArgs {
  /** Routing to delete. Undefined while no division is selected. */
  routingId: string | undefined;
  incomingDocumentId: string;
  /** The division's assignments, as loaded by the panel. */
  items: RoutedDivisionAssignment[];
  /** `true` once `items` is loaded. An empty, still-loading list must not look unroutable-safe. */
  isReady: boolean;
  /** Called after the division has been unrouted (close the panel here). */
  onUnrouted: () => void;
}

/**
 * Confirmation flow for unrouting a division.
 *
 * Rule: a division can be unrouted only when none of its assignments are
 * PENDING or ONGOING. Completed assignments (and their recorded actions)
 * are kept as a record. A division with no assignments is unroutable too.
 *
 * The modal opens even when blocked, so it can explain what to do instead of
 * leaving the user with a disabled button and no reason.
 */
export function useUnrouteDivision({
  routingId,
  incomingDocumentId,
  items,
  isReady,
  onUnrouted,
}: UseUnrouteDivisionArgs) {
  const { mutateAsync, isPending } = useDeleteIncomingDocumentRouting();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  const counts = { pending: 0, ongoing: 0, completed: 0 };
  for (const a of items) {
    if (a.status === "PENDING") counts.pending++;
    else if (a.status === "ONGOING") counts.ongoing++;
    else counts.completed++;
  }
  const canUnroute = counts.pending + counts.ongoing === 0;

  const open = () => {
    if (!isReady) return;
    // Remember the trigger so focus can go back to it when the modal closes.
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsOpen(true);
  };

  const close = () => {
    if (isPending) return;
    setIsOpen(false);
    setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const confirm = async () => {
    if (!routingId || !canUnroute || isPending) return;
    try {
      await mutateAsync({ routingId, incomingDocumentId });
      setIsOpen(false);
      onUnrouted();
    } catch {
      // The mutation's onError already shows the error toast.
      // Keep the modal open so the user can retry or cancel.
    }
  };

  return {
    isOpen,
    isPending,
    canUnroute,
    counts,
    open,
    close,
    confirm,
  };
}
