import { RotateCcw } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { formatDateTime } from "../../../../../../utils/dateFormatter";
import type { IncomingDocumentStatus } from "../../../types/incoming-document.type";
import { isRollbackMove, STATUS_LABEL } from "../../hooks/use-change-status-modal";
import type { IncomingDocumentStatusHistory } from "../../types/incoming-document-status-history.types";

interface StatusHistoryEntryProps {
  entry: IncomingDocumentStatusHistory;
  /**
   * True for the newest change on the unfiltered list, i.e. the change that put
   * the document in its current status. The tab only sets it when no date range
   * is applied, because a filtered list may not include the newest change.
   */
  isLatest?: boolean;
}

/**
 * Colour carries one meaning in an entry: the status the document moved *to*.
 * It matches the status badge in the page header (INCOMING_STATUS_BADGE):
 * pending = warning, ongoing = info, complete = success. It shows up twice, as
 * the marker on the timeline rail and as the colour of the status text. The
 * status name is always written out, so colour is never the only cue.
 */
const MARKER_COLOR: Record<IncomingDocumentStatus, string> = {
  pending: "bg-warning-500",
  ongoing: "bg-blue-light-500",
  complete: "bg-success-500",
};

const STATUS_TEXT: Record<IncomingDocumentStatus, string> = {
  pending: "text-warning-600 dark:text-warning-400",
  ongoing: "text-blue-light-600 dark:text-blue-light-400",
  complete: "text-success-600 dark:text-success-400",
};

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/*
 * Reading order, one sentence per entry:
 *   1. WHO + WHAT   "Maria Cruz changed status from Pending to [Ongoing]"
 *   2. WHEN + ROLE  "Records Officer · 8:14 AM"   (the date is in the day header)
 *   3. WHY          remarks, labelled "Reason for rollback" on rollbacks
 *
 * Type scale (two steps only):
 *   text-theme-sm  primary   the sentence, the new status (semibold), remarks
 *   text-theme-xs  meta      position, time, labels, Rollback and Latest badges
 * Spacing runs on 4px steps: 4 (sentence -> meta), 8 (-> remarks),
 * 20 (entry -> entry).
 */

/**
 * One status change as a single readable sentence. Renders an `<li>`, so use it
 * inside an `<ol>` that has a left border: that border is the timeline rail, and
 * the marker sits on it.
 *
 * The sentence is written out in words ("changed status from X to Y"), so a
 * screen reader reads it as-is and no hidden helper text is needed.
 */
export default function StatusHistoryEntry({
  entry,
  isLatest = false,
}: StatusHistoryEntryProps) {
  const rollback = isRollbackMove(entry.status_from, entry.status_to);
  const person = entry.changed_by_user;

  return (
    <li className="relative pb-5 pl-5 last:pb-0 sm:pl-6">
      {/* Marker, coloured by the new status. -left-[5.5px] centres the 10px marker on the 1px rail. */}
      <span
        aria-hidden="true"
        className={`absolute -left-[5.5px] top-[5px] h-2.5 w-2.5 rounded-full ${MARKER_COLOR[entry.status_to]}`}
      />

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-theme-sm">
        {person ? (
          <span className="font-medium text-gray-800 dark:text-white/90">
            {person.full_name}
          </span>
        ) : (
          <span className="italic text-gray-500 dark:text-gray-400">An unknown user</span>
        )}
        <span className="text-gray-500 dark:text-gray-400">changed status from</span>
        <span className="text-gray-700 dark:text-gray-300">
          {STATUS_LABEL[entry.status_from]}
        </span>
        <span className="text-gray-500 dark:text-gray-400">to</span>
        <span className={`text-theme-xs font-medium ${STATUS_TEXT[entry.status_to]}`}>
          {STATUS_LABEL[entry.status_to]}
        </span>

        {rollback && (
          <span className="ml-1 inline-flex items-center gap-1 text-theme-xs font-semibold text-error-600 dark:text-error-400">
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Rollback
          </span>
        )}

        {isLatest && (
          <span className="ml-1 text-theme-xs font-semibold text-primary dark:text-secondary">
            Latest
          </span>
        )}
      </div>

      <p className="mt-1 wrap-break-word text-theme-xs text-gray-500 dark:text-gray-400">
        {person?.position && <>{person.position} · </>}
        <time
          dateTime={entry.created_at}
          title={formatDateTime(entry.created_at)}
          className="tabular-nums"
        >
          {timeFormat.format(new Date(entry.created_at))}
        </time>
      </p>

      {entry.remarks && (
        <div className="mt-2">
          <p className="mb-1.5 text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Remarks
          </p>
          <p className="wrap-break-word whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2.5 text-theme-sm text-gray-800 dark:bg-white/3 dark:text-white/90">
            {entry.remarks}
          </p>
        </div>
      )}
    </li>
  );
}

/** Same shape as StatusHistoryEntry so the layout doesn't jump when data arrives. */
export function StatusHistoryEntrySkeleton() {
  return (
    <div className="space-y-1 pb-5 pl-5 last:pb-0 sm:pl-6">
      <Skeleton width="70%" height={20} />
      <Skeleton width={120} height={16} />
    </div>
  );
}
