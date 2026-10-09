import { useId } from "react";
import type { Decision } from "../../extraction/types/extraction-types";
import { DECISION_LABELS } from "./DicisionBadge";
import { ChevronDown, Filter } from "lucide-react";
import Popover from "./PopOver";

const DECISION_OPTIONS: { value: Decision | undefined; label: string }[] = [
  { value: undefined, label: "All decisions" },
  { value: "REVIEW", label: DECISION_LABELS.REVIEW },
  { value: "ACCEPT", label: DECISION_LABELS.ACCEPT },
  { value: "INVALID", label: DECISION_LABELS.INVALID },
];

interface FilterPopoverProps {
  decision: Decision | undefined;
  onDecisionChange: (value: Decision | undefined) => void;
  unknownUploader: boolean;
  onUnknownUploaderChange: (value: boolean) => void;
  /** Number of active filters shown in the badge (decision + unknown uploader). */
  activeCount: number;
  onReset: () => void;
}

export default function FilterPopover({
  decision,
  onDecisionChange,
  unknownUploader,
  onUnknownUploaderChange,
  activeCount,
  onReset,
}: FilterPopoverProps) {
  const switchLabelId = useId();

  return (
    <Popover
      panelClassName="w-72"
      renderTrigger={({ open, toggle, triggerProps }) => (
        <button
          type="button"
          onClick={toggle}
          {...triggerProps}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-theme-sm transition ${
            activeCount > 0
              ? "border-secondary/40 bg-secondary/5 text-secondary"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.06]"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filter
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-theme-xs font-medium text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}
    >
      <div className="space-y-3 p-3">
        <fieldset>
          <legend className="mb-1.5 px-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
            Decision
          </legend>
          <div className="space-y-0.5">
            {DECISION_OPTIONS.map((option) => {
              const checked = option.value === decision;
              return (
                <label
                  key={option.label}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-theme-sm transition-colors ${
                    checked
                      ? "bg-secondary/10 text-secondary"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision-filter"
                    checked={checked}
                    onChange={() => onDecisionChange(option.value)}
                    className="h-4 w-4 accent-secondary"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="border-t border-gray-100 pt-3 dark:border-white/[0.06]">
          <div className="flex items-center justify-between gap-3 px-2">
            <span
              id={switchLabelId}
              className="text-theme-sm text-gray-700 dark:text-gray-300"
            >
              Unknown uploader
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={unknownUploader}
              aria-labelledby={switchLabelId}
              onClick={() => onUnknownUploaderChange(!unknownUploader)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                unknownUploader ? "bg-secondary" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  unknownUploader ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>
          <p className="mt-1 px-2 text-theme-xs text-gray-400 dark:text-gray-500">
            Shows documents with no uploader. Name search is paused while on.
          </p>
        </div>

        {activeCount > 0 && (
          <div className="flex justify-end border-t border-gray-100 pt-2 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onReset}
              className="rounded-md px-2 py-1 text-theme-xs text-gray-500 transition-colors hover:text-danger dark:text-gray-400 dark:hover:text-danger"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </Popover>
  );
}
