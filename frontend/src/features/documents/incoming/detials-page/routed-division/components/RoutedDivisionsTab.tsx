import { ChevronRight, Plus } from "lucide-react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import TableShell, {
  type TableShellColumn,
} from "../../../../../../components/tables/TableShell";
import AssignDivisionModal from "../../../shared/component/modal/AssignDivisionModal";
import type { AssignedDivisionNoticeCount } from "../../../types/assigned-division-notice-count-response";
import type { IncomingDocumentDetails } from "../../../types/incoming-document-details.type";
import { cardClass, SKELETON_BASE, SKELETON_HIGHLIGHT } from "../../constant";
import DetailsCard from "../../overview/component/DetialsCard";
import { useRoutedDivisionTab } from "../hooks/use-routed-division-tab";
import DivisionAssignmentsPanel from "./DivisionAssignmentsPanel";

interface RoutedDivisionsTabProps {
  doc: IncomingDocumentDetails;
}

const primaryButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-theme-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-900";

// TableShell applies this as a fixed height (not a max-height), so the table
// keeps the same size regardless of how many rows load.
const TABLE_HEIGHT = "560px";

/* -------------------------------------------------------------------------- */
/*  Summary stat                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Flat stat: small label over a number, no box of its own. Grouped by
 * dividers in the parent `<dl>`, same as the assignments panel, so the
 * card stays the only container (no nested boxes).
 */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-5">
      <dt className="text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab                                                                       */
/* -------------------------------------------------------------------------- */

export default function RoutedDivisionsTab({ doc }: RoutedDivisionsTabProps) {
  const {
    list,
    hasDivisions,
    isLoading,
    isError,
    retry,
    stats,
    isComplete,
    completeHint,
    routing,
    openRouting,
    closeRouting,
    routeModalDoc,
    detailTarget,
    openDetails,
    closeDetails,
    tableRefs,
  } = useRoutedDivisionTab(doc);

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
          {/* Summary stats: the top header. Hidden on error, and hidden
              entirely when the document has no routed divisions yet. */}
          {!isError &&
            (isLoading ? (
              <SkeletonTheme
                baseColor={SKELETON_BASE}
                highlightColor={SKELETON_HIGHLIGHT}
              >
                <div
                  role="status"
                  aria-busy="true"
                  aria-label="Loading routed division totals"
                >
                  <Skeleton height={52} />
                </div>
              </SkeletonTheme>
            ) : (
              hasDivisions && (
                <dl className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-white/8">
                  <Stat label="Routed divisions" value={stats.routedDivisions} />
                  <Stat label="Total assignments" value={stats.totalAssignments} />
                  <Stat label="Pending actions" value={stats.pendingActions} />
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
              onClick={openRouting}
              disabled={isComplete}
              title={isComplete ? completeHint : undefined}
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
              {completeHint}
            </p>
          )}

          {isError ? (
            <div className={`${cardClass} space-y-3 text-center`} role="alert">
              <p className="text-theme-sm text-gray-600 dark:text-gray-300">
                Couldn't load the routed divisions.
              </p>
              <button
                type="button"
                onClick={retry}
                className="rounded text-theme-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
              >
                Retry
              </button>
            </div>
          ) : (
            <TableShell<AssignedDivisionNoticeCount>
              columns={columns}
              data={list}
              isLoading={isLoading}
              isError={false}
              error={undefined}
              entityName="divisions"
              emptyMessage="Not routed to any division yet."
              hasNextPage={false}
              isFetchingNextPage={false}
              {...tableRefs}
              maxTableHeight={TABLE_HEIGHT}
              maxMobileHeight={TABLE_HEIGHT}
              getRowKey={(row) => row.division_id}
              onRowClick={openDetails}
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
                  onClick={() => openDetails(row)}
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
                      <span className="block text-theme-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                        Assignments
                      </span>
                      <span className="mt-0.5 block text-theme-xs tabular-nums text-gray-700 dark:text-gray-300">
                        {row.total_assignments.toLocaleString()}
                      </span>
                    </span>
                    <span className="block">
                      <span className="block text-theme-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
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
        onClose={closeDetails}
        incomingDocumentId={doc.id}
      />

      {routing && <AssignDivisionModal doc={routeModalDoc} onClose={closeRouting} />}
    </>
  );
}
