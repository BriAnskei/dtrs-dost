import { AlertCircle, ArrowRight, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import Modal from "../../../../../../components/Modal";
import StatusBadge, {
  INCOMING_STATUS_BADGE,
} from "../../../../../../components/ui/badge/StatusBadge";
import type { IncomingDocumentStatus } from "../../../types/incoming-document.type";
import { secondaryButton } from "../../detial-panel-form-style-constant";
import { STATUS_LABEL, useChangeStatusModal } from "../../hooks/use-change-status-modal";

interface ChangeStatusModalProps {
  /** Mount only while open; state resets on every open. */
  incomingDocumentId: string;
  trackingNo: string;
  currentStatus: IncomingDocumentStatus;
  onClose: () => void;
}

const STATUS_HINT: Record<IncomingDocumentStatus, string> = {
  pending: "Waiting to be worked on.",
  ongoing: "Work on this document is underway.",
  complete: "All required actions are finished.",
};

const fieldFocus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40";

const submitBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-theme-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-offset-gray-900";

export default function ChangeStatusModal({
  incomingDocumentId,
  trackingNo,
  currentStatus,
  onClose,
}: ChangeStatusModalProps) {
  const baseId = useId();
  const groupErrorId = `${baseId}-target-error`;
  const remarksId = `${baseId}-remarks`;
  const remarksErrorId = `${baseId}-remarks-error`;
  const remarksHintId = `${baseId}-remarks-hint`;

  const {
    options,
    target,
    setTarget,
    targetError,
    remarks,
    setRemarks,
    remarksError,
    isRollback,
    submit,
    isSubmitting,
    submitError,
    dismissSubmitError,
  } = useChangeStatusModal({ incomingDocumentId, currentStatus, onClose });

  const firstRadioRef = useRef<HTMLInputElement>(null);
  const remarksRef = useRef<HTMLTextAreaElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  // On a failed submit, move focus to the first invalid field.
  useEffect(() => {
    if (targetError) firstRadioRef.current?.focus();
  }, [targetError]);
  useEffect(() => {
    if (remarksError) remarksRef.current?.focus();
  }, [remarksError]);
  useEffect(() => {
    if (submitError) {
      errorBannerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [submitError]);

  const targetLabel = target ? STATUS_LABEL[target] : null;
  const submitLabel = isSubmitting
    ? "Updating…"
    : !targetLabel
      ? "Update status"
      : isRollback
        ? `Roll back to ${targetLabel.toLowerCase()}`
        : `Mark as ${targetLabel.toLowerCase()}`;

  return (
    <Modal
      size="md"
      onClose={onClose}
      onSubmit={submit}
      closeDisabled={isSubmitting}
      header={
        <>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Change status
            </h2>
            <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-primary dark:text-secondary">
                {trackingNo}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className={`ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200 ${fieldFocus}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      }
      body={
        <div className="space-y-5">
          {submitError && (
            <div
              ref={errorBannerRef}
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-error-200 bg-error-50 px-4 py-3 dark:border-error-500/30 dark:bg-error-500/10"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-error-500"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-theme-sm font-medium text-error-700 dark:text-error-400">
                  Couldn't update the status
                </p>
                <p className="mt-0.5 text-theme-xs text-error-600 dark:text-error-400/90">
                  {submitError}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissSubmitError}
                aria-label="Dismiss error"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-error-500 transition hover:bg-error-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-error-500/40 dark:hover:bg-error-500/20"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Current -> new, restated so the user can double-check the move. */}
          <div className="flex flex-wrap items-center gap-2 text-theme-sm text-gray-500 dark:text-gray-400">
            <span>Currently</span>
            <StatusBadge config={INCOMING_STATUS_BADGE[currentStatus]} />
            {target && (
              <>
                <ArrowRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <StatusBadge config={INCOMING_STATUS_BADGE[target]} />
                {isRollback && (
                  <span className="rounded-full bg-warning-50 px-2 py-0.5 text-theme-xs font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
                    Rollback
                  </span>
                )}
              </>
            )}
          </div>

          <fieldset
            aria-invalid={targetError ? true : undefined}
            aria-describedby={targetError ? groupErrorId : undefined}
            disabled={isSubmitting}
            className="min-w-0 space-y-2"
          >
            <legend className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              Change to
            </legend>

            {options.map((status, index) => (
              <label key={status} className="block cursor-pointer">
                <input
                  ref={index === 0 ? firstRadioRef : undefined}
                  type="radio"
                  name={`${baseId}-status`}
                  value={status}
                  checked={target === status}
                  onChange={() => setTarget(status)}
                  className="peer sr-only"
                />
                <span className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 transition peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-secondary/40 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 hover:bg-gray-50 dark:border-white/8 dark:hover:bg-white/5 dark:peer-checked:border-secondary dark:peer-checked:bg-secondary/10">
                  <span className="min-w-0">
                    <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                      {STATUS_HINT[status]}
                    </span>
                  </span>
                  <StatusBadge config={INCOMING_STATUS_BADGE[status]} />
                </span>
              </label>
            ))}

            {targetError && (
              <p
                id={groupErrorId}
                role="alert"
                className="text-theme-xs text-error-600 dark:text-error-400"
              >
                {targetError}
              </p>
            )}
          </fieldset>

          {currentStatus === "complete" && target && (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              Reopening this document makes routing to divisions available again.
            </p>
          )}

          {/* Remarks only exist for rollbacks, where they are required. */}
          {isRollback && (
            <div className="space-y-1.5">
              <label
                htmlFor={remarksId}
                className="block text-theme-sm font-semibold text-gray-800 dark:text-white/90"
              >
                Remarks{" "}
                <span className="text-error-500" aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                ref={remarksRef}
                id={remarksId}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                aria-required="true"
                aria-invalid={remarksError ? true : undefined}
                aria-describedby={
                  remarksError ? `${remarksHintId} ${remarksErrorId}` : remarksHintId
                }
                placeholder="Why is this being rolled back?"
                className={`w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-base text-gray-800 placeholder:text-gray-400 disabled:opacity-60 dark:text-white/90 sm:text-theme-sm ${fieldFocus} ${
                  remarksError
                    ? "border-error-500"
                    : "border-gray-200 dark:border-white/8"
                }`}
              />
              <p
                id={remarksHintId}
                className="text-theme-xs text-gray-500 dark:text-gray-400"
              >
                Saved to the document's status history.
              </p>
              {remarksError && (
                <p
                  id={remarksErrorId}
                  role="alert"
                  className="text-theme-xs text-error-600 dark:text-error-400"
                >
                  {remarksError}
                </p>
              )}
            </div>
          )}
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={secondaryButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || target === null}
            className={`${submitBase} ${
              isRollback
                ? "bg-warning-500 hover:bg-warning-600"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {submitLabel}
          </button>
        </>
      }
    />
  );
}
