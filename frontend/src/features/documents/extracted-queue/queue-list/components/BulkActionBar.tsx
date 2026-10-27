import { Ban, Check, X } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  /** Selected rows that are not already ACCEPT. */
  acceptableCount: number;
  /** Selected rows that are not already INVALID. */
  invalidatableCount: number;
  /** True when every loaded row is selected but more pages exist. */
  hasUnloadedRows: boolean;
  onAccept: () => void;
  onInvalidate: () => void;
  /** Deselect everything but stay in selection mode. */
  onClear: () => void;
  /** Leave selection mode (also clears the selection). */
  onDone: () => void;
}

/** Rendered only while selection mode is on. */
export default function BulkActionBar({
  selectedCount,
  acceptableCount,
  invalidatableCount,
  hasUnloadedRows,
  onAccept,
  onInvalidate,
  onClear,
  onDone,
}: BulkActionBarProps) {
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.08]"
    >
      <div className="min-w-0">
        <p
          aria-live="polite"
          className="text-theme-sm font-medium text-gray-800 dark:text-white/90"
        >
          {selectedCount === 0 ? "Select rows to review" : `${selectedCount} selected`}
        </p>
        {hasUnloadedRows && (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            Only the rows loaded so far are selected. Scroll down to load more.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Primary: the only filled button in the bar */}
        <button
          type="button"
          onClick={onAccept}
          disabled={acceptableCount === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3 py-2 text-theme-sm font-medium text-white transition hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-success-600"
        >
          <Check className="h-4 w-4" />
          Accept ({acceptableCount})
        </button>

        {/* Destructive: outlined, so it is clear but not louder than Accept */}
        <button
          type="button"
          onClick={onInvalidate}
          disabled={invalidatableCount === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-transparent px-3 py-2 text-theme-sm font-medium text-error-600 transition hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
        >
          <Ban className="h-4 w-4" />
          Invalidate ({invalidatableCount})
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2 py-2 text-theme-sm text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear selection
          </button>
        )}

        {/* Neutral outline */}
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-theme-sm text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-200 dark:hover:bg-white/[0.06]"
        >
          <X className="h-4 w-4" />
          Done
        </button>
      </div>
    </div>
  );
}
