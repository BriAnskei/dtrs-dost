import type { useResetPasswordModal } from "../../../hooks/reset-password/use-reset-password-modal";

type Props = { modal: ReturnType<typeof useResetPasswordModal> };

export default function TokenConflictStep({ modal }: Props) {
  const { conflictInfo, resolveConflict, isResolvingConflict, goBack } = modal;
  if (!conflictInfo) return null;

  const minutesLeft = Math.max(
    0,
    Math.round(
      (new Date(conflictInfo.existing.expires_at).getTime() - Date.now()) / 60000,
    ),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
        <p className="text-theme-sm font-medium text-amber-800 dark:text-amber-300">
          A reset is already pending
        </p>
        <p className="text-theme-xs text-amber-700/80 dark:text-amber-300/70 mt-1">
          This user already has an active reset request, expiring in about {minutesLeft}{" "}
          minute{minutesLeft === 1 ? "" : "s"}. Cancel it before starting a new one.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={goBack}
          className="flex-1 px-4 py-2 text-theme-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={resolveConflict}
          disabled={isResolvingConflict}
          className="flex-1 px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
        >
          {isResolvingConflict ? "Cancelling…" : "Cancel it & continue"}
        </button>
      </div>
    </div>
  );
}
