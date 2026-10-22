type ReviewActionBarProps = {
  onSave: () => void;
  onInvalidate: () => void;
  disabled?: boolean;
};

export default function ReviewActionBar({
  onSave,
  onInvalidate,
  disabled = false,
}: ReviewActionBarProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end dark:border-white/8">
      <button
        type="button"
        onClick={onInvalidate}
        disabled={disabled}
        className="rounded-lg border border-error-600 bg-white px-4 py-2.5 text-theme-sm font-medium text-error-600 transition hover:bg-error-50 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-error-600/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500 dark:bg-transparent dark:text-error-400 dark:hover:bg-error-500/10"
      >
        Invalidate
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="rounded-lg bg-primary px-4 py-2.5 text-theme-sm font-medium text-white transition hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-secondary dark:hover:bg-secondary/90"
      >
        Save as incoming document
      </button>
    </div>
  );
}
