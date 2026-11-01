import {
  ArrowDownUp,
  CheckCircle2,
  Circle,
  Clock,
  type LucideIcon,
  Search,
} from "lucide-react";
import { type ReactNode, useId } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { formatDateTime } from "../../../../../../utils/dateFormatter";
import AssignmentStatusText from "../../../shared/component/AssignmentStatusText";
import UserTag from "../../../shared/component/UserTag";
import { secondaryButton } from "../../../shared/detial-panel-form-style-constant";
import type { AssignmentStatus } from "../../../types/assignment-types";
import { SKELETON_BASE, SKELETON_HIGHLIGHT } from "../../constant";
import {
  officeLabel,
  STATUS_FILTERS,
  useActionAssignmentsTab,
} from "../hooks/use-action-assignment-tab";
import type {
  AssignmentUser,
  IncomingDocumentAssignment,
} from "../types/incoming-document-assignment";

interface ActionAssignmentsTabProps {
  incomingDocumentId: string;
}

const NODE_STYLE: Record<AssignmentStatus, { icon: LucideIcon; className: string }> = {
  COMPLETE: {
    icon: CheckCircle2,
    className:
      "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  },
  ONGOING: {
    icon: Clock,
    className:
      "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
  },
  PENDING: {
    icon: Circle,
    className: "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500",
  },
};

const fieldFocus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40";

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

function MetaLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
      {children}
    </p>
  );
}

function PersonMeta({
  label,
  person,
  at,
}: {
  label: string;
  person: AssignmentUser | null;
  at: string | null;
}) {
  return (
    <div className="min-w-0">
      <MetaLabel>{label}</MetaLabel>
      {/* UserTag expects `name`; the API gives `full_name`. null renders "Unknown user". */}
      <UserTag
        person={person ? { name: person.full_name, position: person.position } : null}
        size="md"
        showPosition
      />
      {at && (
        <time
          dateTime={at}
          className="mt-1.5 block text-theme-xs text-gray-500 dark:text-gray-400"
        >
          {formatDateTime(at)}
        </time>
      )}
    </div>
  );
}

function AssignmentRow({
  a,
  isLast,
}: {
  a: IncomingDocumentAssignment;
  isLast: boolean;
}) {
  const { icon: Icon, className } = NODE_STYLE[a.status];
  const isComplete = a.status === "COMPLETE";

  return (
    <li className="flex gap-4 px-4 pt-5 sm:px-6">
      {/* Timeline node + connector */}
      <div className="flex flex-col items-center">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${className}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {!isLast && <span className="mt-2 w-px flex-1 bg-gray-200 dark:bg-white/8" />}
      </div>

      <div
        className={`min-w-0 flex-1 space-y-3 pb-5 ${
          isLast ? "" : "border-b border-gray-200 dark:border-white/8"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <span
              className={`inline-block max-w-full truncate rounded-full px-2.5 py-0.5 align-middle text-theme-xs font-medium ${
                a.office_type === "MAIN"
                  ? "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
              }`}
            >
              {a.office_type === "MAIN" ? "Main office" : `Division · ${officeLabel(a)}`}
            </span>
            <p className="wrap-break-word text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {a.notice_of_action}
            </p>
            {a.notice_description && (
              <p className="wrap-break-word whitespace-pre-line text-theme-xs text-gray-500 dark:text-gray-400">
                {a.notice_description}
              </p>
            )}
          </div>
          <div className="shrink-0">
            <AssignmentStatusText status={a.status} />
          </div>
        </div>

        {isComplete && a.action_taken && (
          <p className="wrap-break-word whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2.5 text-theme-sm text-gray-800 dark:bg-white/3 dark:text-white/90">
            {a.action_taken}
          </p>
        )}

        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <PersonMeta label="Assigned by" person={a.assigned_by} at={a.created_at} />
          {isComplete && (
            <PersonMeta
              label="Action taken by"
              person={a.action_taken_by}
              at={a.action_taken_at}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function ListSkeleton() {
  return (
    <SkeletonTheme baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT}>
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading assignments"
        className="space-y-4 p-4 sm:p-6"
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton circle width={32} height={32} />
            <div className="flex-1">
              <Skeleton height={96} borderRadius={12} />
            </div>
          </div>
        ))}
      </div>
    </SkeletonTheme>
  );
}

function Message({
  title,
  body,
  action,
  role,
}: {
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  role?: "alert";
}) {
  return (
    <div role={role} className="px-4 py-12 text-center">
      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
        {title}
      </p>
      {body && (
        <p className="mx-auto mt-1 max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">
          {body}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`mt-3 rounded text-theme-sm font-medium text-primary hover:underline ${fieldFocus}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab                                                                       */
/* -------------------------------------------------------------------------- */

export default function ActionAssignmentsTab({
  incomingDocumentId,
}: ActionAssignmentsTabProps) {
  const idPrefix = useId();
  const searchId = `${idPrefix}-search`;
  const officeId = `${idPrefix}-office`;

  const {
    query,
    total,
    visible,
    counts,
    officeOptions,
    search,
    setSearch,
    status,
    setStatus,
    office,
    setOffice,
    sort,
    toggleSort,
    hasActiveFilters,
    clearFilters,
  } = useActionAssignmentsTab(incomingDocumentId);

  const showToolbar = !query.isLoading && !query.isError && total > 0;

  let content: ReactNode;
  if (query.isLoading) {
    content = <ListSkeleton />;
  } else if (query.isError) {
    content = (
      <Message
        role="alert"
        title="Couldn't load the assignments."
        action={{ label: "Retry", onClick: () => void query.refetch() }}
      />
    );
  } else if (total === 0) {
    content = (
      <Message
        title="No notices of action yet"
        body="Assignments from the main office and routed divisions will appear here."
      />
    );
  } else if (visible.length === 0) {
    content = (
      <Message
        title="No assignments match your filters"
        action={{ label: "Clear filters", onClick: clearFilters }}
      />
    );
  } else {
    content = (
      <ol aria-label="Action assignments">
        {visible.map((a, i) => (
          <AssignmentRow key={a.id} a={a} isLast={i === visible.length - 1} />
        ))}
      </ol>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby={`${idPrefix}-title`}>
      <div>
        <h2
          id={`${idPrefix}-title`}
          className="text-lg font-semibold text-gray-800 dark:text-white/90"
        >
          Action assignments
        </h2>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          Every notice of action assigned on this document, across the main office and all
          divisions.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/8 dark:bg-white/3">
        {showToolbar && (
          <div className="space-y-3 border-b border-gray-200 p-4 dark:border-white/8">
            {/* Row 1: search + office + sort */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <label htmlFor={searchId} className="sr-only">
                  Search assignments
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id={searchId}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notice, office, or person…"
                  className={`h-10 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-3 text-theme-sm text-gray-800 placeholder:text-gray-400 dark:border-white/8 dark:text-white/90 ${fieldFocus}`}
                />
              </div>

              <div className="flex gap-3">
                <label htmlFor={officeId} className="sr-only">
                  Filter by office
                </label>
                <select
                  id={officeId}
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
                  className={`h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-3 text-theme-sm text-gray-800 dark:border-white/8 dark:text-white/90 sm:w-48 sm:flex-none ${fieldFocus}`}
                >
                  {officeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={toggleSort}
                  className={`${secondaryButton} !h-10 !px-3 whitespace-nowrap`}
                >
                  <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                  {sort === "newest" ? "Newest first" : "Oldest first"}
                </button>
              </div>
            </div>

            {/* Row 2: status chips + result count */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div
                role="group"
                aria-label="Filter by status"
                className="flex flex-wrap gap-2"
              >
                {STATUS_FILTERS.map((f) => {
                  const active = status === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStatus(f.id)}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-theme-sm font-medium transition ${fieldFocus} ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/5"
                      }`}
                    >
                      {f.label}
                      <span className="tabular-nums text-theme-xs opacity-70">
                        {counts[f.id]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p
                aria-live="polite"
                className="flex items-center gap-3 text-theme-xs text-gray-500 dark:text-gray-400"
              >
                <span>
                  {visible.length} {hasActiveFilters ? "match" : "assignment"}
                  {visible.length === 1 ? "" : hasActiveFilters ? "es" : "s"}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`rounded font-medium text-primary hover:underline ${fieldFocus}`}
                  >
                    Clear all
                  </button>
                )}
              </p>
            </div>
          </div>
        )}

        {content}
      </div>
    </section>
  );
}
