import { useEffect, useRef } from "react";
import type { ExtractionPhase, LogEntry, LogLevel } from "../../types/extraction-types";

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: "text-blue-light-600 dark:text-blue-light-300",
  success: "text-success-600 dark:text-success-400",
  warn: "text-warning-600 dark:text-warning-400",
  error: "text-error-600 dark:text-error-400",
};

const LEVEL_TAG: Record<LogLevel, string> = {
  info: "INFO",
  success: "OK",
  warn: "WARN",
  error: "FAIL",
};

export default function ExtractionConsole({
  logs,
  phase,
}: {
  logs: LogEntry[];
  phase: ExtractionPhase;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only logs changes should trigger auto-scrolling; bodyRef is a stable ref, and its current DOM element is read when the effect runs.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const running = phase === "source" || phase === "llm";

  return (
    <div
      ref={bodyRef}
      role="log"
      aria-live="polite"
      className="custom-scrollbar h-56 overflow-y-auto rounded-lg border border-gray-200 p-3 font-mono text-theme-xs leading-relaxed text-gray-700 dark:border-gray-800 dark:text-gray-300"
    >
      {logs.map((l) => (
        <div key={l.id} className="flex gap-2">
          <span className="shrink-0 text-gray-400 dark:text-gray-500">{l.time}</span>
          <span className={`w-10 shrink-0 font-semibold ${LEVEL_STYLE[l.level]}`}>
            {LEVEL_TAG[l.level]}
          </span>
          <span className="min-w-0 break-words">{l.message}</span>
        </div>
      ))}
      {running && (
        <span className="mt-1 inline-block h-3 w-1.5 animate-pulse bg-gray-500 dark:bg-gray-400" />
      )}
    </div>
  );
}
