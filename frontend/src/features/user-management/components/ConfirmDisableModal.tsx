// ─── Confirm Disable Modal ────────────────────────────────────────────────────

import type { SystemUser } from "../type/mock.types";

export default function ConfirmDisableModal({
  user,
  onConfirm,
  onClose,
}: {
  user: SystemUser;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isDisabling = user.status === "Active";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 -m-4 bg-black/40 backdrop-blur-sm border-0"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-gray-900 p-6 space-y-4">
        {/* Icon */}
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center ${isDisabling ? "bg-danger/10" : "bg-success/10"}`}
        >
          {isDisabling ? (
            <svg
              aria-hidden="true"
              className="w-5 h-5 text-danger"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              className="w-5 h-5 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        <div>
          <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {isDisabling ? "Disable Account" : "Enable Account"}
          </h3>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {isDisabling
              ? `Are you sure you want to disable ${user.name}'s account? They will no longer be able to log in.`
              : `Re-enable ${user.name}'s account? They will regain access to the system.`}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/[0.08] dark:text-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-theme-sm font-medium text-white rounded-lg transition-colors ${
              isDisabling
                ? "bg-danger hover:bg-danger/90"
                : "bg-success hover:bg-success/90"
            }`}
          >
            {isDisabling ? "Yes, Disable" : "Yes, Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}
