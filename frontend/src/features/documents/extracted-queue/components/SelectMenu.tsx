import { ChevronDown, ListChecks } from "lucide-react";
import type { Decision } from "../../extraction/types/extraction-types";
import { DECISION_LABELS } from "./DicisionBadge";
import Popover from "./PopOver";

const DECISION_ORDER: Decision[] = ["REVIEW", "ACCEPT", "INVALID"];

interface SelectionMenuProps {
  /** True while selection mode is on (checkboxes visible). */
  active: boolean;
  /** Rows currently selected, shown on the button. */
  selectedCount: number;
  /** Rows loaded so far. */
  totalLoaded: number;
  /** Loaded rows per decision, used for the counts and to disable empty options. */
  counts: Record<Decision, number>;
  hasNextPage: boolean;
  /** Show / hide the checkboxes. Hiding also clears the selection. */
  onToggleSelecting: () => void;
  onSelectAll: () => void;
  onSelectDecision: (decision: Decision) => void;
}

function MenuItem({
  label,
  count,
  disabled,
  onClick,
}: {
  label: string;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-start text-theme-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-theme-xs text-gray-400 dark:text-gray-500">{count}</span>
      )}
    </button>
  );
}

/**
 * Split button:
 *  - left half toggles selection mode (show / hide the checkboxes)
 *  - right half (chevron) opens a dropdown of selection shortcuts
 * The dropdown is independent of selection mode: closing it never ends selection.
 */
export default function SelectionMenu({
  active,
  selectedCount,
  totalLoaded,
  counts,
  hasNextPage,
  onToggleSelecting,
  onSelectAll,
  onSelectDecision,
}: SelectionMenuProps) {
  const groupClass = active
    ? "border-secondary/40 bg-secondary/10 text-secondary"
    : "border-gray-200 bg-white text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200";
  const hoverClass = active
    ? "hover:bg-secondary/10"
    : "hover:bg-gray-50 dark:hover:bg-white/[0.06]";

  return (
    <Popover
      align="right"
      panelClassName="w-60"
      renderTrigger={({ open, toggle, triggerProps }) => (
        <div
          className={`inline-flex items-stretch overflow-hidden rounded-lg border text-theme-sm transition ${groupClass}`}
        >
          <button
            type="button"
            onClick={onToggleSelecting}
            aria-pressed={active}
            aria-label={active ? "Hide row selection" : "Select rows"}
            title={active ? "Hide row selection" : "Select rows"}
            className={`inline-flex items-center gap-2 px-3 py-2 transition ${hoverClass}`}
          >
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Select</span>
            {selectedCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-theme-xs font-medium text-white">
                {selectedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggle}
            {...triggerProps}
            aria-label="Selection shortcuts"
            title="Selection shortcuts"
            className={`inline-flex items-center border-l px-2 transition ${hoverClass} ${
              active ? "border-secondary/30" : "border-gray-200 dark:border-white/[0.08]"
            }`}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      )}
    >
      {({ close }) => (
        <div className="p-2">
          <MenuItem
            label="Select all loaded"
            count={totalLoaded}
            disabled={totalLoaded === 0}
            onClick={() => {
              onSelectAll();
              close();
            }}
          />

          <div className="mt-2 border-t border-gray-100 pt-2 dark:border-white/[0.06]">
            <p className="px-2 pb-1 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Select by decision
            </p>
            {DECISION_ORDER.map((decision) => (
              <MenuItem
                key={decision}
                label={DECISION_LABELS[decision]}
                count={counts[decision]}
                disabled={counts[decision] === 0}
                onClick={() => {
                  onSelectDecision(decision);
                  close();
                }}
              />
            ))}
          </div>

          {hasNextPage && (
            <p className="mt-2 border-t border-gray-100 px-2 pt-2 text-theme-xs text-gray-400 dark:border-white/[0.06] dark:text-gray-500">
              Only rows loaded so far can be selected.
            </p>
          )}
        </div>
      )}
    </Popover>
  );
}
