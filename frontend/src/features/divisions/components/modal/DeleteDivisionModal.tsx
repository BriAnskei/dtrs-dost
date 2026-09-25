import Modal from "../../../../components/Modal";
import type { Division } from "../../type/division.type";

interface DeleteDivisionModalProps {
  division: Division;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  error?: Error | null;
}

export default function DeleteDivisionModal({
  division,
  onClose,
  onConfirm,
  isDeleting = false,
  error,
}: DeleteDivisionModalProps) {
  return (
    <Modal
      onClose={onClose}
      size="sm"
      scrollable={false}
      closeDisabled={isDeleting}
      header={
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          Delete "{division.name}"?
        </h3>
      }
      body={
        <div className="space-y-2">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. Are you sure you want to remove this division?
          </p>
          {error && (
            <p className="text-theme-xs text-danger">
              {error.message || "Failed to delete division. Please try again."}
            </p>
          )}
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-danger hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </>
      }
    />
  );
}
