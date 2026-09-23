import type { Division } from "../../type/division.type";

interface DeleteDivisionModalProps {
  division: Division;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteDivisionModal({
  division,
  onClose,
  onConfirm,
}: DeleteDivisionModalProps) {
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 shadow-xl p-5 space-y-4">
        <h3 className="text-theme-md font-semibold text-gray-800 dark:text-white/90">
          Delete "{division.name}"?
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          This division has no users, so it can be removed safely.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
