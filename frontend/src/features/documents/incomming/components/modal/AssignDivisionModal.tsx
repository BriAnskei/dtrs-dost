import { AlertCircle, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import Modal from "../../../../../components/Modal";
import DivisionCombobox from "../../../../user-management/components/DivisionCombobox";
import {
  MAX_NOTICES,
  useAssignDivisionModal,
} from "../../detial-view/hooks/use-assign-division-modal";
import NoticeOfActionEditor from "../NoticeOfActionEditor";
import { secondaryButton } from "../../detials-page/detial-panel-form-style-constant";
import type { IncomingDocumentRow } from "../../types/incoming-document-row.type";

interface AssignDivisionModalProps {
  /** Mount only while open; state resets on every open. */
  doc: Pick<IncomingDocumentRow, "id" | "trackingNo" | "subject">;
  onClose: () => void;
}

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
    submitError,
    dismissSubmitError,
  } = useAssignDivisionModal({ incomingDocumentId: doc.id, onClose });

  const errorBannerRef = useRef<HTMLDivElement>(null);

  // The user is usually at the footer's submit button, with the top of the
  // body possibly scrolled out of view. Bring the error to them.
  useEffect(() => {
    if (submitError) {
      errorBannerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [submitError]);

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
                  Couldn't assign this document
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

            <NoticeOfActionEditor
              idPrefix={baseId}
              notices={notices}
              noticeErrors={noticeErrors}
              lastAddedKey={lastAddedKey}
              canAdd={canAddNotice}
              max={MAX_NOTICES}
              disabled={isSubmitting}
              onAdd={addNotice}
              onUpdate={updateNotice}
              onRemove={removeNotice}
            />
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
