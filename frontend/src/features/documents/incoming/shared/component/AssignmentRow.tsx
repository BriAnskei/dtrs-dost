import {
  Building2,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Clock,
  GitBranch,
  type LucideIcon,
  Trash2,
} from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { formatDateTime } from "../../../../../utils/dateFormatter";
import CompleteAssignmentPanel from "../../detials-page/assignment/components/CompleteAssignmentPanel";
import { canCompleteHere } from "../../detials-page/assignment/hooks/use-action-assignment-tab";
import type { IncomingDocumentAssignment } from "../../detials-page/assignment/types/incoming-document-assignment";
import type { AssignmentStatus } from "../../types/assignment-types";
import { primaryButton } from "../detial-panel-form-style-constant";
import type { AssignmentUser } from "../types/assignment-user-types";
import AssignmentStatusText from "./AssignmentStatusText";
import UserTag from "./UserTag";

/**
 * The row renders one incoming-document assignment. Both user fields
 * (`assigned_by`, `action_taken_by`) use the shared `AssignmentUser` shape.
 */
type AssignmentLike = IncomingDocumentAssignment;

const COMPLETED_NOTICE_HINT =
  "Completed notices can't be deleted because their action is already recorded.";

const noop = () => {};

/**
 * One distinct icon shape per status (not just a colour change), always shown
 * next to the text label, so status never depends on colour alone.
 *
 * - `className`: icon colour
 * - `bg`: tinted circle behind the icon
 * - `line`: vertical connector line above/below the icon (desktop)
 */
const STATUS_ICON: Record<
  AssignmentStatus,
  { icon: LucideIcon; className: string; bg: string; line: string }
> = {
  PENDING: {
    icon: CircleDashed,
    className: "text-gray-400 dark:text-gray-500",
    bg: "bg-gray-100 dark:bg-white/5",
    line: "bg-gray-200 dark:bg-white/10",
  },
  ONGOING: {
    icon: Clock,
    className: "text-warning-600 dark:text-warning-400",
    bg: "bg-warning-50 dark:bg-warning-500/15",
    line: "bg-warning-200 dark:bg-warning-500/30",
  },
  COMPLETE: {
    icon: CheckCircle2,
    className: "text-success-600 dark:text-success-400",
    bg: "bg-success-50 dark:bg-success-500/15",
    line: "bg-success-200 dark:bg-success-500/30",
  },
};

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

/** `person` is `null` when the user was deleted; UserTag shows its fallback label. */
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
      <UserTag person={person} size="md" showPosition />
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

/* -------------------------------------------------------------------------- */
/*  Row                                                                       */
/* -------------------------------------------------------------------------- */

export interface AssignmentRowProps<T extends AssignmentLike> {
  a: T;
  incomingDocumentId: string;
  /** True while this row's inline Complete panel is open. */
  isCompleting?: boolean;
  /** Omit to hide the delete button (read-only usage in other modules). */
  onDelete?: (a: T) => void;
  /** Omit to hide the "Submit action" button and inline Complete panel. */
  onComplete?: (a: T) => void;
  onCancelComplete?: () => void;
  onCompleted?: () => void;
  /** Label above the creator. Defaults to "Assigned by". */
  assignedByLabel?: string;
}

/**
 * One assignment ("notice of action") as a list row. Renders an `<li>`, so use
 * it inside a `<ul>` / `<ol>`.
 *
 * Layout:
 * - sm and up: tinted status icon in its own left column with a vertical line
 *   below it (hidden on the last row), status + delete top-right, people on
 *   the left and the submit button bottom-right.
 * - mobile: no icon column. A header line (tinted status icon + label, delete
 *   on the right) comes first, then office, title and description, then a
 *   divided footer with the people and a full-width submit button.
 */
export default function AssignmentRow<T extends AssignmentLike>({
  a,
  incomingDocumentId,
  isCompleting = false,
  onDelete,
  onComplete,
  onCancelComplete,
  onCompleted,
  assignedByLabel = "Assigned by",
}: AssignmentRowProps<T>) {
  const { icon: Icon, className, bg, line } = STATUS_ICON[a.status];
  const isComplete = a.status === "COMPLETE";
  // Only pending and ongoing notices can be deleted.
  const canDelete = !isComplete;
  // Only ongoing MAIN notices are completed from here.
  const canComplete = Boolean(onComplete) && canCompleteHere(a);
  const showPanel = isCompleting && canComplete;
  const panelId = `complete-panel-${a.id}`;

  return (
    <li className="group relative flex gap-3 px-4 py-5 sm:px-6">
      {/*
        Desktop connector line, drawn in two pieces around the icon so it never
        runs behind the (semi-transparent) tinted circle:
        - top piece: from the row's top edge (-top-px also covers the divide-y
          border) down to the icon.
        - bottom piece: from the icon down to the row's bottom edge.
        Because each piece touches the row edge, consecutive rows join with no
        gap. The first row has no top piece and the last row has no bottom piece.
        Offsets: sm:px-6 (24px) + half of the 36px icon (18px) - half the 2px
        line (1px) = 41px; the icon spans 20px (py-5) to 56px from the row top.
        Hidden on mobile, where the icon lives in the header line instead.
      */}
      <span
        aria-hidden="true"
        className={`absolute -top-px left-[41px] hidden h-[21px] w-0.5 group-first:hidden sm:block ${line}`}
      />
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-[41px] top-14 hidden w-0.5 group-last:hidden sm:block ${line}`}
      />

      {/* Desktop status icon column (the tinted circle). */}
      <div className="relative hidden shrink-0 sm:block">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${bg} ${className}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="order-2 min-w-0 space-y-1.5 sm:order-1">
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

          {/* Mobile: first line of the card (status left, delete right). Desktop: top-right. */}
          <div className="order-1 flex shrink-0 items-center justify-between gap-2 sm:order-2 sm:justify-start">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full sm:hidden ${bg} ${className}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <AssignmentStatusText status={a.status} />
            </div>
            {onDelete && (
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
                className="-my-2.5 -mr-2.5 flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 transition hover:bg-error-50 hover:text-error-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400 sm:m-0 sm:h-8 sm:w-8"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {showPanel && (
          <CompleteAssignmentPanel
            incomingDocumentId={incomingDocumentId}
            assignment={a}
            panelId={panelId}
            onCancel={onCancelComplete ?? noop}
            onCompleted={onCompleted ?? noop}
          />
        )}

        {isComplete && a.action_taken && (
          <div>
            <MetaLabel>Action taken</MetaLabel>
            <p className="wrap-break-word whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2.5 text-theme-sm text-gray-800 dark:bg-white/3 dark:text-white/90">
              {a.action_taken}
            </p>
          </div>
        )}

        {/*
          People + submit button.
          Mobile: divided footer, people first, full-width button below, so the
          button can never overlap the person block.
          sm and up: same line, button bottom-right.
        */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 dark:border-white/5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-6 sm:border-t-0 sm:pt-0">
          <div className="grid w-full min-w-0 gap-x-6 gap-y-3 sm:w-auto sm:flex-1 sm:grid-cols-2">
            <PersonMeta
              label={assignedByLabel}
              person={a.assigned_by}
              at={a.created_at}
            />
            {isComplete && (
              <PersonMeta
                label="Action taken by"
                person={a.action_taken_by}
                at={a.action_taken_at}
              />
            )}
          </div>

          {/* Hidden while the panel is open. */}
          {canComplete && !showPanel && onComplete && (
            <button
              type="button"
              data-respond-trigger={a.id}
              onClick={() => onComplete(a)}
              // `relative` makes the button the containing block for the
              // `sr-only` (position: absolute) span below, so it can't escape
              // the list's scroll container and stretch the page's scroll height.
              className={`${primaryButton} relative min-h-11 w-full justify-center sm:ml-auto sm:min-h-0 sm:w-auto sm:shrink-0`}
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              Submit action
              <span className="sr-only"> for {a.notice_of_action}</span>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Same shape as AssignmentRow so the layout doesn't jump when data arrives. */
export function AssignmentRowSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-5 sm:px-6">
      <div className="hidden sm:block">
        <Skeleton width={36} height={36} circle />
      </div>
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
