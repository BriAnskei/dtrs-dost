import { PROGRESS_STEPS } from "../receiver-upload-constants";
import UploadCheckIcon from "./UploadCheckIcon";

interface Props {
  /** Index of the step in progress. */
  activeIdx: number;
  /** Marks the active step as failed. */
  failed?: boolean;
}

export default function UploadProgressList({ activeIdx, failed = false }: Props) {
  return (
    <ol className="space-y-3" aria-live="polite">
      {PROGRESS_STEPS.map((label, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        const isFailed = active && failed;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                isFailed
                  ? "border-danger bg-danger text-white"
                  : done
                    ? "border-primary bg-primary text-white"
                    : active
                      ? "border-secondary bg-secondary/10 text-secondary"
                      : "border-gray-300 text-gray-400 dark:border-white/15 dark:text-gray-500"
              }`}
            >
              {isFailed ? (
                "!"
              ) : done ? (
                <UploadCheckIcon />
              ) : active ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={`text-theme-sm ${
                active
                  ? "font-medium text-gray-800 dark:text-white/90"
                  : done
                    ? "text-gray-600 dark:text-gray-300"
                    : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {label}
              {active && !failed && "…"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
