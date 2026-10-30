import { ChevronRight, Plus } from "lucide-react";
import { useRef, useState } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import TableShell, {
  type TableShellColumn,
} from "../../../../../../components/tables/TableShell";
import AssignDivisionModal from "../../../components/modal/AssignDivisionModal";
import type { DivisionNoticeOfAction } from "../../../types/assign-incoming-document-to-dto-division.type";
import type { AssignedDivisionNoticeCount } from "../../../types/assigned-division-notice-count-response";
import type { IncomingDocumentDetails } from "../../../types/incoming-document-details.type";
import { cardClass, SKELETON_BASE, SKELETON_HIGHLIGHT } from "../../constant";
import DetailsCard from "../DetialsCard";
import DivisionAssignmentsPanel from "../panel/DivisionAssginmentsPanel";

export interface DivisionCountsState {
  data: AssignedDivisionNoticeCount[] | undefined;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

interface RoutedDivisionsTabProps {
  doc: IncomingDocumentDetails;
  divisions: DivisionCountsState;
  /** Forwarded to the assignments panel. Resolve `true` once saved. */
  onAddAssignments: (
    routingId: string,
    notices: DivisionNoticeOfAction[],
  ) => Promise<boolean>;
  /** Forwarded to the assignments panel. Resolve `true` once deleted. */
  onRemoveAssignment: (routingId: string, assignmentId: string) => Promise<boolean>;
}

const primaryButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-theme-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-900";

const COMPLETE_HINT = "This document is complete, so nothing new can be assigned.";

/**
 * Fixed table heights so the layout stays the same whether the list has
 * 0 rows or 50. Sized for roughly 5 rows; extra rows scroll inside the table.
 *
 * Desktop: sticky header (~41px) + 5 rows (~46px each).
 * Mobile:  5 cards (~105px each) + gaps between them.
 *
 * Tune these if the row padding or card content changes.
 */
const TABLE_HEIGHT_DESKTOP = "272px";
const TABLE_HEIGHT_MOBILE = "580px";

/* -------------------------------------------------------------------------- */
/*  Summary tile                                                              */
/* -------------------------------------------------------------------------- */

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/3">
      <dt className="text-theme-xs text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab                                                                       */
/* -------------------------------------------------------------------------- */

export default function RoutedDivisionsTab({
  doc,
  divisions,
  onAddAssignments,
  onRemoveAssignment,
}: RoutedDivisionsTabProps) {
  const [routing, setRouting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<AssignedDivisionNoticeCount | null>(
    null,
  );

  // TableShell requires scroll refs for infinite scroll; this list is a single
  // unpaginated response, so they are never observed.
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileSentinelRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const desktopSentinelRef = useRef<HTMLDivElement>(null);

  const isComplete = doc.status === "complete";
  const list = divisions.data ?? [];
  const hasDivisions = list.length > 0;
  const totalAssignments = list.reduce((sum, d) => sum + d.total_assignments, 0);
  const totalTaken = list.reduce((sum, d) => sum + d.action_taken_count, 0);
  const totalPending = Math.max(0, totalAssignments - totalTaken);

  const handleViewDetails = (row: AssignedDivisionNoticeCount) => setDetailTarget(row);

  const columns: TableShellColumn<AssignedDivisionNoticeCount>[] = [
    {
      label: "Division",
      width: "w-56",
      render: (row) => (
        <span className="text-gray-800 text-theme-sm font-medium dark:text-white/90">
          {row.division_name}
        </span>
      ),
    },
    {
      label: "Assignments",
      width: "w-28",
      render: (row) => (
        <span className="text-gray-500 text-theme-sm tabular-nums dark:text-gray-400">
          {row.total_assignments.toLocaleString()}
        </span>
      ),
    },
    {
      label: "Actions taken",
      width: "w-28",
      render: (row) => (
        <span className="text-gray-500 text-theme-sm tabular-nums dark:text-gray-400">
          {row.action_taken_count.toLocaleString()}
        </span>
      ),
    },
    {
      label: "",
      width: "w-6",
      render: () => (
        <ChevronRight
          className="h-4 w-4 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
      ),
    },
  ];

  return (
    <>
      <DetailsCard>
        <div className="space-y-5">
          {/* Summary tiles: now the top header. Hidden on error, and hidden
              entirely when the document has no routed divisions yet. */}
          {!divisions.isError &&
            (divisions.isLoading ? (
              <SkeletonTheme
                baseColor={SKELETON_BASE}
                highlightColor={SKELETON_HIGHLIGHT}
              >
                <div
                  role="status"
                  aria-busy="true"
                  aria-label="Loading routed division totals"
                  className="grid gap-3 sm:grid-cols-3"
                >
                  <Skeleton height={88} borderRadius={12} />
                  <Skeleton height={88} borderRadius={12} />
                  <Skeleton height={88} borderRadius={12} />
                </div>
              </SkeletonTheme>
            ) : (
              hasDivisions && (
                <dl className="grid gap-3 sm:grid-cols-3">
                  <StatTile label="Routed divisions" value={list.length} />
                  <StatTile label="Total assignments" value={totalAssignments} />
                  <StatTile label="Pending actions" value={totalPending} />
                </dl>
              )
            ))}

          {/* Description + button row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              Offices this document is routed to, and where their actions stand.
            </p>
            <button
              type="button"
              onClick={() => setRouting(true)}
              disabled={isComplete}
              title={isComplete ? COMPLETE_HINT : undefined}
              className={primaryButton}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Route to division
            </button>
          </div>

          {isComplete && (
            <p
              role="note"
              className="rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-500 dark:bg-white/3 dark:text-gray-400"
            >
              {COMPLETE_HINT}
            </p>
          )}

          {divisions.isError ? (
            <div className={`${cardClass} space-y-3 text-center`} role="alert">
              <p className="text-theme-sm text-gray-600 dark:text-gray-300">
                Couldn't load the routed divisions.
              </p>
              <button
                type="button"
                onClick={divisions.retry}
                className="rounded text-theme-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
              >
                Retry
              </button>
            </div>
          ) : (
            <TableShell<AssignedDivisionNoticeCount>
              columns={columns}
              data={list}
              isLoading={divisions.isLoading}
              isError={false}
              error={undefined}
              entityName="divisions"
              emptyMessage="Not routed to any division yet."
              hasNextPage={false}
              isFetchingNextPage={false}
              mobileScrollRef={mobileScrollRef}
              mobileSentinelRef={mobileSentinelRef}
              desktopScrollRef={desktopScrollRef}
              desktopSentinelRef={desktopSentinelRef}
              // TableShell applies these as a fixed height (not a max-height), so
              // the table keeps the same size regardless of how many rows load.
              maxTableHeight={TABLE_HEIGHT_DESKTOP}
              maxMobileHeight={TABLE_HEIGHT_MOBILE}
              getRowKey={(row) => row.division_id}
              onRowClick={handleViewDetails}
              getRowClassName={(row) =>
                row.division_id === detailTarget?.division_id
                  ? "bg-gray-100/70 dark:bg-white/[0.06]"
                  : ""
              }
              renderToolbar={() => null}
              renderMobileCard={(row) => (
                <button
                  key={row.division_id}
                  type="button"
                  onClick={() => handleViewDetails(row)}
                  aria-label={`View details for ${row.division_name}`}
                  className={`block w-full cursor-pointer rounded-xl border bg-white dark:bg-white/[0.03] p-4 text-left space-y-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    row.division_id === detailTarget?.division_id
                      ? "border-secondary/50 dark:border-secondary/50"
                      : "border-gray-200 dark:border-white/[0.08]"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="block min-w-0 text-theme-sm font-semibold text-gray-800 dark:text-white/90 leading-snug wrap-break-word">
                      {row.division_name}
                    </span>
                    <ChevronRight
                      className="mt-1 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500"
                      aria-hidden="true"
                    />
                  </span>

                  <span className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <span className="block">
                      <span className="block text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                        Assignments
                      </span>
                      <span className="mt-0.5 block text-theme-xs tabular-nums text-gray-700 dark:text-gray-300">
                        {row.total_assignments.toLocaleString()}
                      </span>
                    </span>
                    <span className="block">
                      <span className="block text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                        Actions taken
                      </span>
                      <span className="mt-0.5 block text-theme-xs tabular-nums text-gray-700 dark:text-gray-300">
                        {row.action_taken_count.toLocaleString()}
                      </span>
                    </span>
                  </span>
                </button>
              )}
            />
          )}
        </div>
      </DetailsCard>

      {/* Always mounted so it can animate out; `row={null}` means closed. */}
      <DivisionAssignmentsPanel
        row={detailTarget}
        isDocComplete={isComplete}
        onClose={() => setDetailTarget(null)}
        onAddAssignments={onAddAssignments}
        onRemoveAssignment={onRemoveAssignment}
      />

      {routing && (
        <AssignDivisionModal
          doc={{
            id: doc.id,
            trackingNo: doc.code ?? doc.tracking_sequence,
            subject: doc.subject,
          }}
          onClose={() => setRouting(false)}
        />
      )}
    </>
  );
}
