import { FIELD_LABELS } from "../../extraction/constans";
import {
  formatPercent,
  isLowConfidence,
  toPercent,
} from "../../extraction/receiver/helpers/reciever-upload-confidence";
import type { ReceiverExtractedField } from "../../extraction/receiver/types/reciever-upload-api-types";

interface Props {
  field: ReceiverExtractedField;
  /** Alignment of the "Source · AI" line on sm+ screens. */
  align?: "left" | "right";
}

const LOW_TEXT = "text-error-600 dark:text-error-400";

/** Effective confidence bar + percentage, with the source/AI breakdown underneath. */
export default function MyUploadedConfidenceMeter({ field, align = "right" }: Props) {
  const effective = toPercent(field.effectiveConfidence);
  const source = toPercent(field.sourceConfidence);
  const ai = toPercent(field.aiConfidence);
  const low = isLowConfidence(effective);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={`${FIELD_LABELS[field.field]} effective confidence`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={effective ?? undefined}
          aria-valuetext={effective == null ? "Not available" : `${effective}%`}
          className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/8"
        >
          <div
            className={`h-full rounded-full ${
              low ? "bg-error-500" : "bg-gray-400 dark:bg-gray-500"
            }`}
            style={{ width: `${effective ?? 0}%` }}
          />
        </div>
        <span
          className={`w-10 text-right text-theme-sm font-semibold tabular-nums ${
            low ? LOW_TEXT : "text-gray-800 dark:text-white/90"
          }`}
        >
          {formatPercent(effective)}
        </span>
      </div>
      <p
        className={`mt-1 text-theme-xs text-gray-400 dark:text-gray-500 ${
          align === "right" ? "sm:text-right" : ""
        }`}
      >
        Source {formatPercent(source)} · AI {formatPercent(ai)}
      </p>
    </div>
  );
}
