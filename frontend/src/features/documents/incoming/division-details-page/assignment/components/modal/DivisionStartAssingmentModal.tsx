import { Stamp } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import Modal from "../../../../../../../components/Modal";
import type { IncomingDocumentAssignment } from "../../../../detials-page/assignment/types/incoming-document-assignment";
import {
  primaryButton,
  secondaryButton,
} from "../../../../shared/detial-panel-form-style-constant";

interface DivisionStartAssignmentModalProps {
  /** The assignment being started. `null` = modal closed. */
  assignment: IncomingDocumentAssignment | null;
  /** True while the start request is in flight. */
  isPending: boolean;
  /** Message from the last failed start attempt, shown inside the modal. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirms moving a notice of action from PENDING to ONGOING.
 *
 * A small centered modal (not a slide panel): there is nothing to fill in, and
 * the step can't be undone, so one short, specific confirmation is enough.
 * Enter confirms (the shared Modal wraps its footer in a form), Esc cancels,
 * and both are blocked while the request is pending.
 *
 * If the request fails, the modal stays open and shows the error above the
 * buttons so the user can retry.
 */
export default function DivisionStartAssignmentModal({
  assignment,
  isPending,
  error,
  onConfirm,
  onCancel,
}: DivisionStartAssignmentModalProps) {
  const titleId = useId();
  const startRef = useRef<HTMLButtonElement>(null);
  const isOpen = assignment !== null;

  // Move focus to the primary action when the modal opens.
  useEffect(() => {
    if (isOpen) startRef.current?.focus();
  }, [isOpen]);

  // Esc closes the modal unless a request is running.
  useEffect(() => {
    if (!isOpen || isPending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, isPending, onCancel]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      onSubmit={onConfirm}
      closeDisabled={isPending}
      size="md"
      header={
        <h2
          id={titleId}
          className="text-lg font-semibold text-gray-800 dark:text-white/90"
        >
          Acknowledge this notice of action?
        </h2>
      }
      body={
        assignment && (
          <div className="space-y-3">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              Your division has received this notice of action:
            </p>
            <p className="wrap-break-word rounded-lg bg-gray-50 px-3 py-2.5 text-theme-sm font-medium text-gray-800 dark:bg-white/3 dark:text-white/90">
              {assignment.notice_of_action}
            </p>
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              Your division will be recorded as working on it. Status changes from Pending
              to Ongoing, and you can then submit the action taken. This can't be undone.
            </p>

            {error && (
              <div
                role="alert"
                className="wrap-break-word rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
              >
                {error}
              </div>
            )}
          </div>
        )
      }
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={`${secondaryButton} min-h-11 sm:min-h-0`}
          >
            Cancel
          </button>
          <button
            ref={startRef}
            type="submit"
            disabled={isPending}
            className={`${primaryButton} min-h-11 sm:min-h-0`}
          >
            <Stamp className="h-4 w-4" aria-hidden="true" />
            {isPending ? "Acknowledging…" : error ? "Try again" : "Acknowledge and start"}
          </button>
        </>
      }
    />
  );
}
