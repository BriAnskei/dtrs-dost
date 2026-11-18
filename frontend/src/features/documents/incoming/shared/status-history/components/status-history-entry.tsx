import { ArrowRight, RotateCcw } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { formatDateTime } from "../../../../../../utils/dateFormatter";
import {
  isRollbackMove,
  STATUS_LABEL,
} from "../../../shared/hooks/use-change-status-modal";
import type { IncomingDocumentStatusHistory } from "../../../shared/types/incoming-document-status-history.types";
import type { IncomingDocumentStatus } from "../../../types/incoming-document.type";

interface StatusHistoryEntryProps {
  entry: IncomingDocumentStatusHistory;
}

/**
 * The only colour in an entry: a small dot beside the status the document
 * moved *to*. Everything else is neutral gray, so the list stays calm and the
 * colour still reads as "what is the new status". The status name is always
 * written out next to the dot, so it never depends on colour alone.
 */
const DOT_COLOR: Record<IncomingDocumentStatus, string> = {
  pending: "bg-gray-400 dark:bg-gray-500",
  ongoing: "bg-warning-500",
  complete: "bg-success-500",
};

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/*
 * Type scale for this tab (two steps only):
 *   text-theme-sm  primary   status names, remarks
 *   text-theme-xs  meta      time, person, day header, footer
 * Spacing runs on 4px steps: 4 (status line -> person), 8 (-> remarks),
 * 20 (entry -> entry).
 */

/**
 * One status change as a compact audit-log line. Renders an `<li>`, so use it
 * inside an `<ol>` that has a left border: that border is the timeline rail,
 * and the small neutral marker sits on it.
 *
 * Read it as one sentence: [from] -> [to], by whom, at what time, why. The date
 * comes from the group header above, so each line only shows the time.
 */
export default function StatusHistoryEntry({ entry }: StatusHistoryEntryProps) {
  const rollback = isRollbackMove(entry.status_from, entry.status_to);
  const person = entry.changed_by_user;

  return (
    <li className="relative pb-5 pl-5 last:pb-0 sm:pl-6">
      {/* Neutral marker. -left-[4.5px] centres the 8px marker on the 1px rail. */}
      <span
        aria-hidden="true"
        className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-gray-300 dark:bg-white/25"
      />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-theme-sm">
        <span className="sr-only">Status changed from</span>
        <span className="text-gray-500 dark:text-gray-400">
          {STATUS_LABEL[entry.status_from]}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
        <span className="sr-only">to</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-white/90">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${DOT_COLOR[entry.status_to]}`}
          />
          {STATUS_LABEL[entry.status_to]}
        </span>

        {rollback && (
          <span className="inline-flex items-center gap-1 text-theme-xs text-gray-500 dark:text-gray-400">
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Rollback
          </span>
        )}

        <time
          dateTime={entry.created_at}
          title={formatDateTime(entry.created_at)}
          className="ml-auto shrink-0 text-theme-xs tabular-nums text-gray-500 dark:text-gray-400"
        >
          {timeFormat.format(new Date(entry.created_at))}
        </time>
      </div>

      <p className="mt-1 wrap-break-word text-theme-xs text-gray-500 dark:text-gray-400">
        {person ? (
          <>
            by{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {person.full_name}
            </span>
            {person.position && <> · {person.position}</>}
          </>
        ) : (
          <span className="italic">by an unknown user</span>
        )}
      </p>

      {entry.remarks && (
        <p className="mt-2 wrap-break-word whitespace-pre-line border-l-2 border-gray-200 pl-3 text-theme-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
          <span className="sr-only">Remarks: </span>
          {entry.remarks}
        </p>
      )}
    </li>
  );
}

/** Same shape as StatusHistoryEntry so the layout doesn't jump when data arrives. */
export function StatusHistoryEntrySkeleton() {
  return (
    <div className="space-y-1 pb-5 pl-5 last:pb-0 sm:pl-6">
      <Skeleton width={180} height={20} />
      <Skeleton width={140} height={16} />
    </div>
  );
}
