import { useState } from "react";
import type { DeactivatedSystemUser } from "../../types/deactivated-user.types";

interface PermanentDeleteUserModalProps {
  user: DeactivatedSystemUser;
  onClose: () => void;
  onConfirm: (user: DeactivatedSystemUser) => void;
}

// Same note as ReactivateUserModal — self-contained overlay, swap for your
// shared Modal component if one exists.
//
// Deletion here is permanent (distinct from deactivation), so this asks the
// admin to type the user's name before the confirm button unlocks — matches
// the weight of an irreversible action. Adjust/remove that friction if your
// team prefers a plain confirm.
export default function PermanentDeleteUserModal({
  user,
  onClose,
  onConfirm,
}: PermanentDeleteUserModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const canConfirm = confirmText.trim() === user.name;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 className="text-theme-sm font-semibold text-danger">
          Permanently delete {user.name}?
        </h3>
        <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          This cannot be undone. Their account, role, and access history will be
          permanently removed.
        </p>

        <label className="mt-4 block text-theme-xs text-gray-500 dark:text-gray-400">
          Type{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {user.name}
          </span>{" "}
          to confirm
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-theme-sm text-gray-700 focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20 dark:border-white/8 dark:bg-white/3 dark:text-gray-200"
          autoComplete="off"
        />

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
            disabled={!canConfirm}
            onClick={() => onConfirm(user)}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-danger hover:bg-danger/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
