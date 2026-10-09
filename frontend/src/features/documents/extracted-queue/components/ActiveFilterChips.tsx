import { X } from "lucide-react";
import type { Decision } from "../../extraction/types/extraction-types";
import { DECISION_LABELS } from "./DicisionBadge";

interface ActiveFilterChipsProps {
  decision: Decision | undefined;
  unknownUploader: boolean;
  onClearDecision: () => void;
  onClearUnknownUploader: () => void;
  onClearAll: () => void;
}

/** Shows what the Filter popover is currently applying. Renders nothing when no filter is active. */
export default function ActiveFilterChips({
  decision,
  unknownUploader,
  onClearDecision,
  onClearUnknownUploader,
  onClearAll,
}: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (decision) {
    chips.push({
      key: "decision",
      label: `Decision: ${DECISION_LABELS[decision]}`,
      onRemove: onClearDecision,
    });
  }
  if (unknownUploader) {
    chips.push({
      key: "unknown-uploader",
      label: "Unknown uploader",
      onRemove: onClearUnknownUploader,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-2"
    >
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-secondary/30 bg-secondary/10 py-1 pl-2.5 pr-1.5 text-theme-xs font-medium text-secondary"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove filter: ${chip.label}`}
            className="rounded-full p-0.5 transition-colors hover:bg-secondary/20"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="px-1 text-theme-xs text-gray-500 transition-colors hover:text-danger dark:text-gray-400 dark:hover:text-danger"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
