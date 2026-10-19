import { ACCEPT_THRESHOLD } from "../../constans";
import type { Decision } from "../../types/extraction-types";

const STYLE: Record<Decision, { box: string; title: string; text: string }> = {
  ACCEPT: {
    box: "border-success-200 bg-success-50 dark:border-success-500/30 dark:bg-success-500/10",
    title: "ACCEPTED",
    text: "All fields present and confidence meets the threshold.",
  },
  REVIEW: {
    box: "border-warning-200 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/10",
    title: "HUMAN REVIEW REQUIRED",
    text: "At least one field is below the threshold and needs validation.",
  },
  INVALID: {
    box: "border-error-200 bg-error-50 dark:border-error-500/30 dark:bg-error-500/10",
    title: "INVALID",
    text: "One or more fields are missing or could not be verified.",
  },
};

interface Props {
  decision: Decision;
  minEffective: number | null;
}

export default function DecisionBanner({
  decision,
  minEffective,
}: Props) {
  const s = STYLE[decision];
  return (
    <div className={`rounded-xl border p-4 ${s.box}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {s.title}
        </p>
        <p className="text-theme-xs text-gray-600 dark:text-gray-300">
          Min confidence:{" "}
          <span className="font-semibold">
            {minEffective !== null ? `${minEffective}%` : "—"}
          </span>
          {" · "}Threshold: ≥ {ACCEPT_THRESHOLD}%
        </p>
      </div>
      <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-300">{s.text}</p>
    </div>
  );
}
