import { Building2, GitBranch, X } from "lucide-react";
import Modal from "../../../../../../../components/Modal";
import AssignmentStatusText from "../../../../shared/component/AssignmentStatusText";
import { secondaryButton } from "../../../../shared/detial-panel-form-style-constant";
import { useDeleteAssignmentModal } from "../../hooks/use-delete-assignment-modal";
import type { IncomingDocumentAssignment } from "../../types/incoming-document-assignment";

interface DeleteAssignmentModalProps {
  incomingDocumentId: string;
  assignment: IncomingDocumentAssignment;
  onClose: () => void;
  onDeleted: () => void;
}

// Swap for your shared danger button style if you have one.
const dangerButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-error-600 px-4 text-theme-sm font-medium text-white transition hover:bg-error-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-error-500/40 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Confirms deleting one notice of action. Mount only while open.
 * State and the API call live in `useDeleteAssignmentModal`; this file is layout only.
 */
export default function DeleteAssignmentModal({
  incomingDocumentId,
  assignment,
  onClose,
  onDeleted,
}: DeleteAssignmentModalProps) {
  const m = useDeleteAssignmentModal({
    incomingDocumentId,
    assignment,
    onClose,
    onDeleted,
  });

  const isMain = assignment.office_type === "MAIN";
  const OfficeIcon = isMain ? Building2 : GitBranch;
  const officeLabel = isMain
    ? "Main office"
    : (assignment.division_name ?? "Unknown division");

  const header = (
    <>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Delete notice of action
        </h2>
        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          This can't be undone.
        </p>
      </div>
      <button
        type="button"
        onClick={m.requestClose}
        disabled={m.isSubmitting}
        aria-label="Close"
        className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-gray-200"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );

  const body = (
    <div className="space-y-4">
      {m.canDelete ? (
        <p className="text-theme-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to delete this notice of action?
        </p>
      ) : (
        <p
          role="alert"
          className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-theme-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400"
        >
          This notice is already completed and its action is recorded, so it can't be
          deleted.
        </p>
      )}

      <div className="space-y-2 rounded-lg bg-gray-50 px-3 py-3 dark:bg-white/3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-theme-xs font-medium text-gray-600 dark:text-gray-300">
            <OfficeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{officeLabel}</span>
          </span>
          <AssignmentStatusText status={assignment.status} />
        </div>
        <p className="wrap-break-word text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {assignment.notice_of_action}
        </p>
        {assignment.notice_description && (
          <p className="wrap-break-word whitespace-pre-line text-theme-xs text-gray-500 dark:text-gray-400">
            {assignment.notice_description}
          </p>
        )}
      </div>
    </div>
  );

  const footer = (
    <>
      <button
        type="button"
        onClick={m.requestClose}
        disabled={m.isSubmitting}
        className={secondaryButton}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={m.isSubmitting || !m.canDelete}
        className={dangerButton}
      >
        {m.isSubmitting ? "Deleting…" : "Delete"}
      </button>
    </>
  );

  return (
    <Modal
      size="sm"
      onClose={m.requestClose}
      closeDisabled={m.isSubmitting}
      onSubmit={() => void m.submit()}
      header={header}
      body={body}
      footer={footer}
    />
  );
}
