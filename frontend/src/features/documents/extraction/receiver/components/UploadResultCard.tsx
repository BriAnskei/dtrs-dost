import type { Decision } from "../../types/extraction-types";
import {
  formatPercent,
  isLowConfidence,
  toPercent,
} from "../helpers/reciever-upload-confidence";
import { CONFIDENCE_THRESHOLDS, FIELD_LABELS } from "../receiver-upload-constants";
import type { ReceiverUploadResponse } from "../types/reciever-upload-api-types";

interface Props {
  fileName: string;
  result: ReceiverUploadResponse;
}

/** Color is text-only and reserved for states that need attention; ACCEPT stays neutral. */
const DECISION_STYLES: Record<
  Decision,
  { label: string; message: string; text: string }
> = {
  ACCEPT: {
    label: "Accepted",
    message: "The details were extracted successfully.",
    text: "text-gray-700 dark:text-gray-200",
  },
  REVIEW: {
    label: "Needs review",
    message: "Some details have low confidence.",
    text: "text-warning-700 dark:text-warning-400",
  },
  INVALID: {
    label: "Invalid",
    message: "The document could not be reliably read.",
    text: "text-error-600 dark:text-error-400",
  },
};

const LOW_TEXT = "text-error-600 dark:text-error-400";

export default function UploadResultCard({ fileName, result }: Props) {
  const style = DECISION_STYLES[result.decision];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/8 dark:bg-white/3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {fileName}
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              Sent to an admin for validation. {style.message}
            </p>
          </div>
          <span className={`shrink-0 text-theme-sm font-semibold ${style.text}`}>
            {style.label}
          </span>
        </div>
      </div>

      {/* Fields */}
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-white/5 dark:border-white/8 dark:bg-white/3">
        {result.fields.map((f) => {
          const effective = toPercent(f.effectiveConfidence);
          const source = toPercent(f.sourceConfidence);
          const ai = toPercent(f.aiConfidence);
          const low = isLowConfidence(effective);

          return (
            <li
              key={f.field}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              {/* Left: field + value */}
              <div className="min-w-0 flex-1">
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {FIELD_LABELS[f.field]}
                </p>
                {f.value ? (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-theme-sm text-gray-800 dark:text-white/90">
                    {f.value}
                  </p>
                ) : (
                  <p className="mt-0.5 text-theme-sm italic text-gray-400 dark:text-gray-500">
                    Not found
                  </p>
                )}
              </div>

              {/* Right: bar + effective %, then source / AI */}
              <div className="shrink-0 sm:w-44">
                <div className="flex items-center gap-3">
                  <div
                    role="progressbar"
                    aria-label={`${FIELD_LABELS[f.field]} effective confidence`}
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
                <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500 sm:text-right">
                  Source {formatPercent(source)} · AI {formatPercent(ai)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-theme-xs text-gray-400 dark:text-gray-500">
        The percentage is the effective confidence (source and AI combined). Values below{" "}
        {CONFIDENCE_THRESHOLDS.medium}% are shown in red. An admin will verify the details
        before the document is added.
      </p>
    </div>
  );
}
