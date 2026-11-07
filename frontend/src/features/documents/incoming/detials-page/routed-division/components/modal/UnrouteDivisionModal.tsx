import { useEffect, useRef } from "react";
import Modal from "../../../../../../../components/Modal";
import { secondaryButton } from "../../../../shared/detial-panel-form-style-constant";

interface UnrouteDivisionModalProps {
  isOpen: boolean;
  divisionName: string;
  /** Assignment counts by status. */
  counts: { pending: number; ongoing: number; completed: number };
  /** `false` when pending or ongoing notices still exist. */
  canUnroute: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const dangerButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-error-500 px-4 py-2.5 text-theme-sm font-medium text-white transition hover:bg-error-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-error-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-offset-gray-900";

const TITLE_ID = "unroute-division-title";
const DESC_ID = "unroute-division-desc";

/**
 * Confirmation for unrouting a division from a document.
 *
 * Two states:
 *  - blocked: pending/ongoing notices exist. Explains the two ways forward
 *    (delete them, or wait until they are completed) with a single "Got it".
 *  - confirm: states what will happen, including that completed notices are
 *    kept as a record. Cancel gets initial focus (the safe choice), and the
 *    red confirm button sits to its right.
 */
export default function UnrouteDivisionModal({
  isOpen,
  divisionName,
  counts,
  canUnroute,
  isPending,
  onConfirm,
  onClose,
}: UnrouteDivisionModalProps) {
  // Ref for the safe, initially focused button. Only one footer renders at a
  // time ("Cancel" or "Got it"), so a single ref covers both states.
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog when it opens (or switches state). Done
  // manually instead of with `autoFocus` to satisfy jsx-a11y/no-autofocus.
  // The frame delay lets the Modal finish mounting its content first.
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  // The shell doesn't handle Escape itself. Capture it here so it also
  // doesn't reach the detail panel underneath and close that too.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (!isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, isPending, onClose]);

  const unfinished = counts.pending + counts.ongoing;

  const breakdown = [
    counts.pending > 0 ? `${counts.pending} pending` : null,
    counts.ongoing > 0 ? `${counts.ongoing} ongoing` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  const header = (
    <h2 id={TITLE_ID} className="text-lg font-semibold text-gray-800 dark:text-white/90">
      {canUnroute ? `Unroute ${divisionName}?` : "Can't unroute yet"}
    </h2>
  );

  const body = canUnroute ? (
    <div
      id={DESC_ID}
      className="space-y-3 text-theme-sm text-gray-600 dark:text-gray-300"
    >
      <p>This division will now have no access to this document.</p>
      {counts.completed > 0 && (
        <p>
          {`Its ${counts.completed} completed ${plural(
            counts.completed,
            "notice",
            "notices",
          )} and recorded ${plural(
            counts.completed,
            "action",
            "actions",
          )} will be kept as a record.`}
        </p>
      )}
    </div>
  ) : (
    <div
      id={DESC_ID}
      className="space-y-3 text-theme-sm text-gray-600 dark:text-gray-300"
    >
      <p>
        {divisionName} still has {unfinished} unfinished{" "}
        {plural(unfinished, "notice", "notices")} ({breakdown}).
      </p>
      <p>To unroute this division, do one of the following:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Delete all of its pending and ongoing notices, or</li>
        <li>Wait until every notice is completed.</li>
      </ul>
      {counts.completed > 0 && (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          Completed notices are never deleted, and stay on record either way.
        </p>
      )}
    </div>
  );

  const footer = canUnroute ? (
    <>
      <button
        type="button"
        ref={initialFocusRef}
        onClick={onClose}
        disabled={isPending}
        className={secondaryButton}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isPending}
        className={dangerButton}
      >
        {isPending ? "Unrouting…" : "Unroute division"}
      </button>
    </>
  ) : (
    <button
      type="button"
      ref={initialFocusRef}
      onClick={onClose}
      className={secondaryButton}
    >
      Got it
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      // Confirming needs an explicit answer; the info-only state can be dismissed anywhere.
      backdropCloses={!canUnroute}
      closeDisabled={isPending}
      header={header}
      body={body}
      footer={footer}
    />
  );
}
