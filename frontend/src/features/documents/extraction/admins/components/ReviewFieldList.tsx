import { FIELD_LABELS } from "../../constans";
import { confidenceTone, isFlagged } from "../../helpers/extraction-helpers";
import type { FieldKey, ResultRow } from "../../types/extraction-types";

interface Props {
  rows: ResultRow[];
  edits: Partial<Record<FieldKey, string>>;
  selected: FieldKey | null;
  onSelect: (f: FieldKey) => void;
  onMove: (delta: 1 | -1) => void;
  onNextFlagged: () => void;
  flaggedCount: number;
}

export default function ReviewFieldList({
  rows,
  edits,
  selected,
  onSelect,
  onMove,
  onNextFlagged,
  flaggedCount,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {flaggedCount === 0
            ? "All fields pass"
            : `${flaggedCount} of ${rows.length} fields need review`}
          <span className="hidden sm:inline"> · ↑↓ to navigate</span>
        </p>
        {flaggedCount > 0 && (
          <button
            type="button"
            onClick={onNextFlagged}
            className="px-2.5 py-1 text-theme-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 transition whitespace-nowrap dark:border-white/8 dark:bg-white/3 dark:text-gray-200"
          >
            Next flagged ⚑
          </button>
        )}
      </div>

      <div
        role="listbox"
        aria-label="Extracted fields"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            onMove(e.key === "ArrowDown" ? 1 : -1);
          }
        }}
        className="custom-scrollbar flex-1 space-y-2 overflow-y-auto rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
      >
        {rows.map((r) => {
          const active = r.field === selected;
          const flagged = isFlagged(r);
          const edited = r.field in edits;
          const shownValue = edited ? edits[r.field] : r.value;
          return (
            <button
              key={r.field}
              type="button"
              role="option"
              aria-selected={active}
              tabIndex={-1}
              onClick={() => onSelect(r.field)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                active
                  ? "border-secondary bg-secondary/5 ring-2 ring-secondary/30 dark:bg-secondary/10"
                  : flagged
                    ? "border-warning-200 bg-warning-50/60 hover:border-secondary/40 dark:border-warning-500/30 dark:bg-warning-500/5"
                    : "border-gray-200 bg-white hover:border-secondary/40 dark:border-white/8 dark:bg-white/3"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {FIELD_LABELS[r.field]}
                  {edited && (
                    <span className="ml-2 rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-secondary">
                      Edited
                    </span>
                  )}
                </span>
                <span
                  className={`text-theme-xs font-semibold whitespace-nowrap ${confidenceTone(r.effectiveConfidence)}`}
                >
                  {r.effectiveConfidence !== null
                    ? `${r.effectiveConfidence}%`
                    : "Not found"}
                  {flagged && <span className="ml-1.5 font-normal">⚑ review</span>}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line break-words text-theme-sm text-gray-800 dark:text-white/90">
                {shownValue ? (
                  shownValue
                ) : edited ? (
                  <span className="italic text-gray-400">Empty</span>
                ) : (
                  <span className="text-danger">Not found</span>
                )}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
