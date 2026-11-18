import {
  Building2,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Clock,
  GitBranch,
  type LucideIcon,
  Stamp,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
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

/** Default rule for the "Start" button: only pending notices can be started. */
const canStartPending = (a: AssignmentLike) => a.status === "PENDING";

/**
 * One distinct icon shape per status (not just a colour change), always shown
 * next to the text label, so status never depends on colour alone.
 *
 * - `className`: icon colour
 * - `bg`: tinted circle behind the icon
 * - `line`: vertical connector line above/below the icon (desktop)
 * - `accent`: left border of the "Action taken" block
 * - `tint`: soft background of the "Action taken" block
 */
const STATUS_ICON: Record<
  AssignmentStatus,
  {
    icon: LucideIcon;
    className: string;
    bg: string;
    line: string;
    accent: string;
    tint: string;
  }
> = {
  PENDING: {
    icon: CircleDashed,
    className: "text-gray-400 dark:text-gray-500",
    bg: "bg-gray-100 dark:bg-white/5",
    line: "bg-gray-200 dark:bg-white/10",
    accent: "border-gray-300 dark:border-white/20",
    tint: "bg-gray-50 dark:bg-white/3",
  },
  ONGOING: {
    icon: Clock,
    className: "text-warning-600 dark:text-warning-400",
    bg: "bg-warning-50 dark:bg-warning-500/15",
    line: "bg-warning-200 dark:bg-warning-500/30",
    accent: "border-warning-400 dark:border-warning-500/60",
    tint: "bg-warning-50/60 dark:bg-warning-500/10",
  },
  COMPLETE: {
    icon: CheckCircle2,
    className: "text-success-600 dark:text-success-400",
    bg: "bg-success-50 dark:bg-success-500/15",
    line: "bg-success-200 dark:bg-success-500/30",
    accent: "border-success-500 dark:border-success-500/60",
    tint: "bg-success-50/60 dark:bg-success-500/10",
  },
};

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

const LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";

/** Small-caps field label, used above the two focal blocks. */
function MetaLabel({ children }: { children: string }) {
  return <p className={`mb-1.5 ${LABEL_CLASS}`}>{children}</p>;
}

/**
 * Who did it and when: a quiet, single-line `<dl>` that sits under the block it
 * belongs to ("Assigned by" under the notice, "Action taken by" under the
 * action). `person` is `null` when the user was deleted; UserTag shows its
 * fallback label.
 */
function Attribution({
  label,
  person,
  at,
}: {
  label: string;
  person: AssignmentUser | null;
  at: string | null;
}) {
  return (
    <dl className="m-0 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <dt className={LABEL_CLASS}>{label}</dt>
      <dd className="m-0 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <UserTag person={person} size="md" showPosition />
        {at && (
          <time
            dateTime={at}
            className="text-theme-xs tabular-nums text-gray-500 dark:text-gray-400"
          >
            {formatDateTime(at)}
          </time>
        )}
      </dd>
    </dl>
  );
}

/** MAIN = assigned to the main office; DIVISION = assigned to a specific division. */
function OfficePill({ a }: { a: IncomingDocumentAssignment }) {
  const isMain = a.office_type === "MAIN";
  const Icon = isMain ? Building2 : GitBranch;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={`inline-flex max-w-full items-center gap-1.5 text-theme-xs font-medium ${
          isMain ? "text-gray-700 dark:text-gray-300" : "text-blue-700 dark:text-blue-300"
        }`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {isMain ? "Main office" : (a.division_name ?? "Unknown division")}
        </span>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Row                                                                       */
/* -------------------------------------------------------------------------- */

/** What `renderCompletePanel` receives. Same wiring the default panel gets. */
export interface CompletePanelRenderArgs<T extends AssignmentLike> {
  assignment: T;
  panelId: string;
  onCancel: () => void;
  onCompleted: () => void;
}

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
  /**
   * Omit to hide the "Acknowledge and start" button (e.g. on the admin side). The row only
   * reports the click; the parent owns the confirmation UI and the request.
   */
  onStart?: (a: T) => void;
  /** Label above the creator. Defaults to "Assigned by". */
  assignedByLabel?: string;
  /**
   * Decides whether the "Submit action" button shows for a row.
   * Defaults to the admin rule (`canCompleteHere`: ONGOING + MAIN office).
   */
  canCompleteRow?: (a: T) => boolean;
  /**
   * Decides whether the "Acknowledge and start" button shows for a row (only used when
   * `onStart` is passed). Defaults to PENDING rows.
   */
  canStartRow?: (a: T) => boolean;
  /** Hide the office pill, e.g. in the division view where every row is the same office. */
  hideOffice?: boolean;
  /**
   * Replaces the default (admin) inline Complete panel. Omit to keep
   * `CompleteAssignmentPanel`.
   */
  renderCompletePanel?: (args: CompletePanelRenderArgs<T>) => ReactNode;
}

/**
 * One assignment ("notice of action") as a list row, laid out like an entry in
 * an official register. Renders an `<li>`, so use it inside a `<ul>` / `<ol>`.
 *
 * The two things people come here to read are the NOTICE and the ACTION TAKEN,
 * so they get the size, weight and whitespace. Everything else (office, status,
 * who/when) is second-tier: small, muted, and tucked around them.
 *
 * Structure (same on every screen size, only the spacing changes):
 * 1. Meta line (quiet): "Assigned to" office on the left, status tag + delete
 *    on the right. The status always has an icon AND a text label.
 * 2. THE NOTICE (focal): small-caps label, the notice as the largest text in
 *    the row, then its description, then a muted "Assigned by" attribution.
 * 3. The inline Complete panel, when open.
 * 4. THE ACTION TAKEN (focal, completed notices only): a tinted block with a
 *    status-coloured rule, the recorded action as large readable text, then a
 *    muted "Action taken by" attribution.
 * 5. The start / submit button, right-aligned on desktop, full-width on mobile.
 *
 * - sm and up: a tinted status icon in its own left column, joined to its
 *   neighbours by a vertical line (a timeline). The line is hidden on the last
 *   row, unless that row is also the only one.
 * - mobile: no icon column; the icon moves into the meta line instead.
 *
 * The "Acknowledge and start" (PENDING) and "Submit action" (ONGOING) buttons never show at
 * the same time, because each one is gated by a different status.
 */
export default function AssignmentRow<T extends AssignmentLike>({
  a,
  incomingDocumentId,
  isCompleting = false,
  onDelete,
  onComplete,
  onCancelComplete,
  onCompleted,
  onStart,
  assignedByLabel = "Assigned by",
  canCompleteRow = canCompleteHere,
  canStartRow = canStartPending,
  hideOffice = false,
  renderCompletePanel,
}: AssignmentRowProps<T>) {
  const { icon: Icon, className, bg, line, accent, tint } = STATUS_ICON[a.status];
  const isComplete = a.status === "COMPLETE";
  // Only pending and ongoing notices can be deleted.
  const canDelete = !isComplete;
  // Admin default: only ongoing MAIN notices. Override with `canCompleteRow`.
  const canComplete = Boolean(onComplete) && canCompleteRow(a);
  const showPanel = isCompleting && canComplete;
  // Division view: pending notices can be started. Admin passes no `onStart`.
  const canStart = Boolean(onStart) && canStartRow(a);
  const panelId = `complete-panel-${a.id}`;
  const showActions = canStart || (canComplete && !showPanel);

  // Sits on the same row as the "Assigned by" attribution, so the button
  // doesn't take a line of its own. Mobile: stacks below, full width.
  // sm and up: right-aligned on the same line.
  const rowActions = showActions ? (
    <div className="flex shrink-0 sm:justify-end">
      {/*
        Start: PENDING rows, when the parent passes `onStart`. Stays visible
        while the parent's confirm dialog is open so it can get focus back
        on cancel.
      */}
      {canStart && onStart && (
        <button
          type="button"
          data-start-trigger={a.id}
          onClick={() => onStart(a)}
          // `relative`: same reason as the Submit button below.
          className={`${primaryButton} relative min-h-11 w-full justify-center sm:min-h-0 sm:w-auto`}
        >
          <Stamp className="h-4 w-4" aria-hidden="true" />
          Acknowledge and start
          <span className="sr-only">: {a.notice_of_action}</span>
        </button>
      )}

      {/* Hidden while the panel is open. */}
      {canComplete && !showPanel && onComplete && (
        <button
          type="button"
          data-respond-trigger={a.id}
          onClick={() => onComplete(a)}
          // `relative` makes the button the containing block for the
          // `sr-only` (position: absolute) span below, so it can't escape
          // the list's scroll container and stretch the page's scroll height.
          className={`${primaryButton} relative min-h-11 w-full justify-center sm:min-h-0 sm:w-auto`}
        >
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          Submit action
          <span className="sr-only"> for {a.notice_of_action}</span>
        </button>
      )}
    </div>
  ) : null;

  return (
    <li className="group relative flex gap-3 px-4 py-5 sm:px-6">
      {/*
        Desktop connector line, drawn in two pieces around the icon so it never
        runs behind the (semi-transparent) tinted circle:
        - top piece: from the row's top edge (-top-px also covers the divide-y
          border) down to the icon.
        - bottom piece: from the icon down to the row's bottom edge.
        Because each piece touches the row edge, consecutive rows join with no
        gap. The first row has no top piece. The last row has no bottom piece,
        except when it is also the only row: then the bottom piece stays so a
        single record still shows a line running down from its icon.
        Offsets: sm:px-6 (24px) + half of the 36px icon (18px) - half the 2px
        line (1px) = 41px; the icon spans 20px (py-5) to 56px from the row top.
        Hidden on mobile, where the icon lives in the meta line instead.
      */}
      <span
        aria-hidden="true"
        className={`absolute -top-px left-[41px] hidden h-[21px] w-0.5 group-first:hidden sm:block ${line}`}
      />
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-[41px] top-14 hidden w-0.5 group-[:last-child:not(:first-child)]:hidden sm:block ${line}`}
      />

      {/* Desktop status icon column (the tinted circle). */}
      <div className="relative hidden shrink-0 sm:block">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-inset ring-black/5 dark:ring-white/10 ${bg} ${className}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-5">
        {/* 1. Meta line: office + status + delete. Deliberately quiet. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {/* Mobile: first line of the card (status left, delete right). Desktop: right side. */}
          <div className="order-1 flex shrink-0 items-center justify-between gap-2 sm:order-2 sm:justify-start">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset ring-black/5 dark:ring-white/10 sm:hidden ${bg} ${className}`}
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

          {!hideOffice && (
            <div className="order-2 min-w-0 sm:order-1">
              <OfficePill a={a} />
            </div>
          )}
        </div>
        {/* 2. THE NOTICE: the primary content of the row. */}
        <section aria-label="Notice of action">
          <MetaLabel>Notice of action</MetaLabel>
          <p className="wrap-break-word text-theme-sm font-semibold leading-snug text-gray-900 dark:text-white/90">
            {a.notice_of_action}
          </p>
          {a.notice_description && (
            <p className="wrap-break-word mt-2 max-w-prose whitespace-pre-line text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {a.notice_description}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Attribution
              label={assignedByLabel}
              person={a.assigned_by}
              at={a.created_at}
            />
            {rowActions}
          </div>
        </section>
        {/* 3. Inline Complete panel. */}
        {showPanel &&
          (renderCompletePanel ? (
            renderCompletePanel({
              assignment: a,
              panelId,
              onCancel: onCancelComplete ?? noop,
              onCompleted: onCompleted ?? noop,
            })
          ) : (
            <CompleteAssignmentPanel
              incomingDocumentId={incomingDocumentId}
              assignment={a}
              panelId={panelId}
              onCancel={onCancelComplete ?? noop}
              onCompleted={onCompleted ?? noop}
            />
          ))}
        {/* 4. THE ACTION TAKEN: the second focal block, set off with a tint and a status rule. */}
        {isComplete && (
          <section
            aria-label="Action taken"
            className={`rounded-lg border-l-4 px-4 py-4 sm:px-5 ${accent} ${tint}`}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <Icon className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true" />
              <p className={LABEL_CLASS}>Action taken</p>
            </div>
            {a.action_taken ? (
              <p className="wrap-break-word whitespace-pre-line text-theme-sm leading-relaxed text-gray-900 dark:text-white/90">
                {a.action_taken}
              </p>
            ) : (
              <p className="text-theme-sm italic text-gray-500 dark:text-gray-400">
                No details were recorded.
              </p>
            )}
            <div className="mt-3 border-t border-black/5 pt-3 dark:border-white/10">
              <Attribution
                label="Action taken by"
                person={a.action_taken_by}
                at={a.action_taken_at}
              />
            </div>
          </section>
        )}{" "}
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
      <div className="min-w-0 flex-1 space-y-5">
        {/* Meta line */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton width={140} height={12} />
          <Skeleton width={80} height={20} borderRadius={4} />
        </div>
        {/* Notice */}
        <div className="space-y-2">
          <Skeleton width={96} height={10} />
          <Skeleton width="70%" height={18} />
          <Skeleton width="45%" height={14} />
          <Skeleton width={200} height={24} borderRadius={4} />
        </div>
        {/* Action taken block */}
        <Skeleton height={88} borderRadius={8} />
      </div>
    </div>
  );
}
