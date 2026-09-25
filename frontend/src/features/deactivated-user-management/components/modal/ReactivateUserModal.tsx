import type { DeactivatedSystemUser } from "../../types/deactivated-user.types";

interface ReactivateUserModalProps {
  user: DeactivatedSystemUser;
  onClose: () => void;
  onConfirm: (user: DeactivatedSystemUser) => void;
}

// NOTE: I don't have the codebase's shared <Modal> wrapper (used by
// AddUserModal / EditUserModal / etc.), so this is a self-contained overlay
// styled to match the flat/minimal look of the rest of the table. Swap the
// outer two divs for your shared Modal component if one exists.
export default function ReactivateUserModal({
  user,
  onClose,
  onConfirm,
}: ReactivateUserModalProps) {
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          Reactivate {user.name}?
        </h3>
        <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          This will restore their access and move them back to the active user list.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-theme-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(user)}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            Reactivate
          </button>
        </div>
      </div>
    </div>
  );
}
