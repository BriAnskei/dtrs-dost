import {
  ArrowDownUp,
  Building2,
  CheckCircle2,
  CircleDashed,
  Clock,
  GitBranch,
  type LucideIcon,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { type ReactNode, useId } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { THIN_SCROLLBAR } from "../../../../../../contant/ThinScrollBar";
import { formatDateTime } from "../../../../../../utils/dateFormatter";
import AssignmentStatusText from "../../../shared/component/AssignmentStatusText";
import UserTag from "../../../shared/component/UserTag";
import {
  primaryButton,
  secondaryButton,
} from "../../../shared/detial-panel-form-style-constant";
import type { AssignmentStatus } from "../../../types/assignment-types";
import { SKELETON_BASE, SKELETON_HIGHLIGHT } from "../../constant";
import {
  OFFICE_FILTERS,
  STATUS_FILTERS,
  useActionAssignmentsTab,
} from "../hooks/use-action-assignment-tab";
import type {
  AssignmentUser,
  IncomingDocumentAssignment,
} from "../types/incoming-document-assignment";
import AddAssignmentModal from "./modal/AddAssignmentModal";
import DeleteAssignmentModal from "./modal/DeleteAssignmentModal";

interface ActionAssignmentsTabProps {
  incomingDocumentId: string;
  /** Max height of the scrollable list, like TableShell's `maxTableHeight`. */
  maxListHeight?: string;
}

const fieldFocus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40";

const COMPLETED_NOTICE_HINT =
  "Completed notices can't be deleted because their action is already recorded.";

/**
 * One distinct icon shape per status (not just a colour change), always shown
 * next to the text label, so status never depends on colour alone.
 */
const STATUS_ICON: Record<AssignmentStatus, { icon: LucideIcon; className: string }> = {
  PENDING: {
    icon: CircleDashed,
    className: "text-gray-400 dark:text-gray-500",
  },
  ONGOING: {
    icon: Clock,
    className: "text-warning-600 dark:text-warning-400",
  },
  COMPLETE: {
    icon: CheckCircle2,
    className: "text-success-600 dark:text-success-400",
  },
};

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

function FilterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const id = useId();
  return (
    <div className="w-full sm:w-auto">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`h-9 w-full rounded-lg border bg-transparent px-3 text-theme-sm dark:bg-gray-900 sm:w-auto ${fieldFocus} ${
          value === options[0].id
            ? "border-gray-200 text-gray-600 dark:border-white/8 dark:text-gray-300"
            : "border-primary/50 text-gray-800 dark:text-white/90"
        }`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

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

/** MAIN = assigned to the main office; DIVISION = assigned to a specific division. */
function OfficePill({ a }: { a: IncomingDocumentAssignment }) {
  const isMain = a.office_type === "MAIN";
  const Icon = isMain ? Building2 : GitBranch;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 text-theme-xs font-medium ${
        isMain ? "text-gray-600 dark:text-gray-300" : "text-blue-600 dark:text-blue-300"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {isMain ? "Main office" : (a.division_name ?? "Unknown division")}
      </span>
    </span>
  );
}

function AssignmentRow({
  a,
  onDelete,
}: {
  a: IncomingDocumentAssignment;
  onDelete: (a: IncomingDocumentAssignment) => void;
}) {
  const { icon: Icon, className } = STATUS_ICON[a.status];
  const isComplete = a.status === "COMPLETE";
  // Only pending and ongoing notices can be deleted.
  const canDelete = !isComplete;

  return (
    <li className="flex gap-3 px-4 py-5 sm:px-6">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center ${className}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <OfficePill a={a} />
            <p className="wrap-break-word text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {a.notice_of_action}
            </p>
            {a.notice_description && (
              <p className="wrap-break-word whitespace-pre-line text-theme-xs text-gray-500 dark:text-gray-400">
                {a.notice_description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AssignmentStatusText status={a.status} />
            <button
              type="button"
              onClick={() => onDelete(a)}
              disabled={!canDelete}
              title={canDelete ? undefined : COMPLETED_NOTICE_HINT}
              aria-label={
                canDelete
                  ? `Delete notice of action: ${a.notice_of_action}`
                  : `Can't delete completed notice of action: ${a.notice_of_action}`
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-error-50 hover:text-error-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
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

/** Same shape as AssignmentRow so the layout doesn't jump when data arrives. */
function RowSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-5 sm:px-6">
      <Skeleton width={36} height={36} borderRadius={8} />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton width={128} height={20} borderRadius={999} />
        <Skeleton width="65%" height={16} />
        <Skeleton width="40%" height={12} />
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <Skeleton height={36} />
          <Skeleton height={36} className="hidden sm:block" />
        </div>
      </div>
    </div>
  );
}

function ListSkeleton({ rows, label }: { rows: number; label: string }) {
  return (
    <SkeletonTheme baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT}>
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="divide-y divide-gray-200 dark:divide-white/8"
      >
        {Array.from({ length: rows }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows, never reordered.
          <RowSkeleton key={i} />
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
  maxListHeight = "560px",
}: ActionAssignmentsTabProps) {
  const {
    query,
    items,
    hasMore,
    isLoadingMore,
    loadMoreFailed,
    loadMore,
    scrollRef,
    sentinelRef,
    status,
    setStatus,
    office,
    setOffice,
    sort,
    toggleSort,
    hasActiveFilters,
    clearFilters,
    searchInput,
    setSearchInput,
    search,
    isPlaceholderData,
    searchId,
    searchRef,
    clearSearch,
    handleSearchKeyDown,
    addButtonRef,
    isAddOpen,
    openAdd,
    closeAdd,
    assignmentToDelete,
    requestDelete,
    closeDelete,
    handleDeleted,
    fullError,
    showToolbar,
    showFooter,
    countLabel,
  } = useActionAssignmentsTab(incomingDocumentId);

  let content: ReactNode;
  if (query.isLoading) {
    content = <ListSkeleton rows={3} label="Loading assignments" />;
  } else if (fullError) {
    content = (
      <Message
        role="alert"
        title="Couldn't load the assignments."
        action={{ label: "Retry", onClick: () => void query.refetch() }}
      />
    );
  } else if (items.length === 0) {
    content = hasActiveFilters ? (
      <Message
        title={
          search
            ? `No notices of action match "${search}"`
            : "No assignments match these filters"
        }
        action={{ label: "Clear filters", onClick: clearFilters }}
      />
    ) : (
      <Message
        title="No notices of action yet"
        body="Assignments from the main office and routed divisions will appear here."
      />
    );
  } else {
    content = (
      <>
        <ol className="divide-y divide-gray-200 dark:divide-white/8">
          {items.map((a) => (
            <AssignmentRow key={a.id} a={a} onDelete={requestDelete} />
          ))}
        </ol>

        {/* Reaching this element loads the next page. */}
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />

        {isLoadingMore && (
          <div className="border-t border-gray-200 dark:border-white/8">
            <ListSkeleton rows={2} label="Loading more assignments" />
          </div>
        )}

        {loadMoreFailed && (
          <div className="flex flex-col items-center gap-2 border-t border-gray-200 p-4 dark:border-white/8">
            <p role="alert" className="text-theme-xs text-error-600 dark:text-error-400">
              Couldn't load more assignments.
            </p>
            <button type="button" onClick={loadMore} className={secondaryButton}>
              Try again
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="space-y-4" aria-label="Action assignments">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/8 dark:bg-white/3">
        {/* Header block: description + add button on top, then the search/filter row.
            One shared container, so there's no divider between them. */}
        <div className="space-y-4 border-b border-gray-200 p-4 dark:border-white/8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              Every notice of action on this document, whether assigned to the main office
              or to a specific division.
            </p>

            <button
              ref={addButtonRef}
              type="button"
              onClick={openAdd}
              className={primaryButton}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add new
            </button>
          </div>

          {showToolbar && (
            // biome-ignore lint/a11y/useSemanticElements: `<search>` needs @types/react 19+; swap it in if you're on those types.
            <div
              role="search"
              aria-label="Filter assignments"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="relative w-full sm:w-96">
                <label htmlFor={searchId} className="sr-only">
                  Search by notice of action
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  id={searchId}
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search notice of action…"
                  autoComplete="off"
                  className={`h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-9 text-theme-sm text-gray-800 placeholder:text-gray-400 dark:border-white/8 dark:text-white/90 [&::-webkit-search-cancel-button]:hidden ${fieldFocus}`}
                />
                {searchInput && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clearSearch}
                    className={`absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${fieldFocus}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <FilterSelect
                  label="Filter by status"
                  options={STATUS_FILTERS}
                  value={status}
                  onChange={setStatus}
                />
                <FilterSelect
                  label="Filter by office"
                  options={OFFICE_FILTERS}
                  value={office}
                  onChange={setOffice}
                />
                <button
                  type="button"
                  onClick={toggleSort}
                  className={`${secondaryButton} !h-9 !px-3 whitespace-nowrap`}
                >
                  <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                  {sort === "newest" ? "Newest first" : "Oldest first"}
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`rounded px-1 text-theme-sm font-medium text-primary hover:underline ${fieldFocus}`}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/*
          Scroll area: capped height, thin scrollbar. Focusable so keyboard users
          can scroll it. Previous results stay visible (dimmed) while a new
          search/filter loads.
        */}
        {/* biome-ignore lint/a11y/useSemanticElements: scroll container is typed as HTMLDivElement by useInfiniteScrollSentinel. */}
        <div
          ref={scrollRef}
          role="region"
          aria-label="Action assignments list"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-focusable (WCAG 2.1.1).
          tabIndex={0}
          aria-busy={isPlaceholderData}
          className={`overflow-y-auto transition-opacity ${THIN_SCROLLBAR} ${fieldFocus} ${
            isPlaceholderData ? "opacity-60" : ""
          }`}
          style={{ maxHeight: maxListHeight, overflowAnchor: "none" }}
        >
          {content}
        </div>

        {showFooter && (
          <div
            aria-live="polite"
            className="border-t border-gray-200 px-4 py-3 text-theme-xs text-gray-500 dark:border-white/8 dark:text-gray-400"
          >
            {isPlaceholderData ? (
              "Updating…"
            ) : (
              <>
                Showing{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {items.length}
                  {hasMore ? "+" : ""}
                </span>{" "}
                {countLabel}
                {!hasMore && " (all loaded)"}
              </>
            )}
          </div>
        )}
      </div>

      {isAddOpen && (
        <AddAssignmentModal incomingDocumentId={incomingDocumentId} onClose={closeAdd} />
      )}

      {assignmentToDelete && (
        <DeleteAssignmentModal
          incomingDocumentId={incomingDocumentId}
          assignment={assignmentToDelete}
          onClose={closeDelete}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}
