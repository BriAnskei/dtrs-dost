import { Plus, X } from "lucide-react";
import { useId } from "react";
import Modal from "../../../../../../components/Modal";
import DivisionCombobox from "../../../../../user-management/components/DivisionCombobox";
import type { IncomingDocumentRow } from "../../../types/incoming-document-row.type";
import {
  MAX_NOTICES,
  useAssignDivisionModal,
} from "../../hooks/use-assign-division-modal";

interface AssignDivisionModalProps {
  /** Mount only while open; state resets on every open. */
  doc: IncomingDocumentRow;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-lg border bg-white px-3 text-theme-sm text-gray-800 placeholder:text-gray-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:opacity-60 dark:bg-white/3 dark:text-white/90 dark:placeholder:text-gray-500";
const inputBorder = (hasError: boolean) =>
  hasError ? "border-error-500" : "border-gray-200 dark:border-white/8";

const labelClass = "block text-theme-xs font-medium text-gray-700 dark:text-gray-300";
const errorClass = "mt-1 text-theme-xs text-error-500";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/8 dark:bg-white/3 dark:text-gray-200 dark:hover:bg-white/5";

/* -------------------------------------------------------------------------- */
/*  Modal                                                                     */
/* -------------------------------------------------------------------------- */

export default function AssignDivisionModal({ doc, onClose }: AssignDivisionModalProps) {
  const baseId = useId();
  const {
    division,
    setDivision,
    divisionError,
    notices,
    noticeErrors,
    lastAddedKey,
    canAddNotice,
    addNotice,
    updateNotice,
    removeNotice,
    submit,
    isSubmitting,
  } = useAssignDivisionModal({ incomingDocumentId: doc.id, onClose });

  return (
    <Modal
      size="lg"
      onClose={onClose}
      onSubmit={submit}
      closeDisabled={isSubmitting}
      header={
        <>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Assign to division
            </h2>
            <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-primary dark:text-secondary">
                {doc.trackingNo}
              </span>
              {" – "}
              {doc.subject}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      }
      body={
        <div className="space-y-6">
          <DivisionCombobox
            value={division?.division_name}
            onSelect={setDivision}
            error={divisionError ?? undefined}
            requireSelection
            required
            disabled={isSubmitting}
          />

          <section className="space-y-3" aria-labelledby={`${baseId}-notices`}>
            <div>
              <h3
                id={`${baseId}-notices`}
                className="text-theme-sm font-semibold text-gray-800 dark:text-white/90"
              >
                Notices of action
              </h3>
              <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                Tell the division what to do with this document. Add one for each action
                required.
              </p>
            </div>

            {notices.length > 0 && (
              <ul className="space-y-3">
                {notices.map((notice, index) => {
                  const noticeId = `${baseId}-notice-${notice.key}`;
                  const descId = `${baseId}-desc-${notice.key}`;
                  const errorId = `${noticeId}-error`;
                  const error = noticeErrors[notice.key];
                  const position = index + 1;

                  return (
                    <li
                      key={notice.key}
                      className="rounded-xl border border-gray-200 p-3 dark:border-white/8"
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div>
                            <label htmlFor={noticeId} className={labelClass}>
                              Notice of action {position}{" "}
                              <span className="text-error-500">*</span>
                            </label>
                            <input
                              id={noticeId}
                              type="text"
                              value={notice.noticeOfAction}
                              onChange={(e) =>
                                updateNotice(notice.key, {
                                  noticeOfAction: e.target.value,
                                })
                              }
                              autoFocus={notice.key === lastAddedKey}
                              placeholder="e.g. For appropriate action"
                              disabled={isSubmitting}
                              aria-required="true"
                              aria-invalid={!!error}
                              aria-describedby={error ? errorId : undefined}
                              className={`mt-1 h-10 ${inputClass} ${inputBorder(!!error)}`}
                            />
                            {error && (
                              <p id={errorId} role="alert" className={errorClass}>
                                {error}
                              </p>
                            )}
                          </div>
                          <div>
                            <label htmlFor={descId} className={labelClass}>
                              Description {position}
                            </label>
                            <textarea
                              id={descId}
                              rows={2}
                              value={notice.noticeDescription}
                              onChange={(e) =>
                                updateNotice(notice.key, {
                                  noticeDescription: e.target.value,
                                })
                              }
                              placeholder="Add details or instructions"
                              disabled={isSubmitting}
                              className={`mt-1 resize-none py-2 ${inputClass} ${inputBorder(false)}`}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNotice(notice.key)}
                          disabled={isSubmitting}
                          aria-label={`Remove notice of action ${position}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-gray-200"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={addNotice}
                disabled={!canAddNotice || isSubmitting}
                className={`${secondaryButton} ${
                  notices.length === 0 ? "w-full border-dashed py-3" : ""
                }`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {notices.length === 0
                  ? "Add a notice of action"
                  : "Add another notice of action"}
              </button>
              {notices.length > 0 && (
                <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                  {notices.length} of {MAX_NOTICES}
                </span>
              )}
            </div>
          </section>
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
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-theme-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-offset-gray-900"
          >
            {isSubmitting ? "Assigning…" : "Assign division"}
          </button>
        </>
      }
    />
  );
}
