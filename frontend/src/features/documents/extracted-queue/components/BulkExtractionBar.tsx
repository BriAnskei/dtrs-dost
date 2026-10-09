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
      className="flex flex-col gap-3 rounded-xl border border-secondary/30 bg-secondary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
        <button
          type="button"
          onClick={onAccept}
          disabled={acceptableCount === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-theme-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Accept ({acceptableCount})
        </button>

        <button
          type="button"
          onClick={onInvalidate}
          disabled={invalidatableCount === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-theme-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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

        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-theme-sm text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.06]"
        >
          <X className="h-4 w-4" />
          Done
        </button>
      </div>
    </div>
  );
}
