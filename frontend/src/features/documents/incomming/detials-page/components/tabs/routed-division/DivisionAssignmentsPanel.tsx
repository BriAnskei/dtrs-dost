import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import DetailPanel, {
  DetailSection,
} from "../../../../../../../components/master-detail/DetailPanel";
import { formatDateTime } from "../../../../../../../utils/dateFormatter";
import NoticeOfActionEditor from "../../../../components/NoticeOfActionEditor";
import type { AssignedDivisionNoticeCount } from "../../../../types/assigned-division-notice-count-response";
import type { Status } from "../../../../types/routed-division-assignments.type";
import { cardClass, SKELETON_BASE, SKELETON_HIGHLIGHT } from "../../../constant";
import {
  primaryButton,
  secondaryButton,
} from "../../../detial-panel-form-style-constant";
import { useDivisionAssignmentsPanel } from "../../../hooks/use-division-assignment-panel";
import AssignmentStatusText from "./AssignmentStatusText";
import UserTag from "./UserTag";

const COMPLETE_HINT = "This document is complete, so its assignments can't be changed.";

interface DivisionAssignmentsPanelProps {
  /** The selected division row. `null` closes the panel. */
  row: AssignedDivisionNoticeCount | null;
  incomingDocumentId: string;
  /** Completed documents are read-only. */
  isDocComplete: boolean;
  onClose: () => void;
}

const confirmMessage = (status: Status) =>
  status === "COMPLETE"
    ? "Delete this notice and its recorded action? This can't be undone."
    : "Delete this notice? The division is already working on it. This can't be undone.";

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Flat stat: small label over a number, no box of its own.
 * Stats are grouped by dividers in the parent `<dl>`, so the panel
 * surface stays the only container (no nested cards).
 */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0">
      <dt className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Panel                                                                     */
/* -------------------------------------------------------------------------- */

export default function DivisionAssignmentsPanel({
  row,
  isDocComplete,
  onClose,
  incomingDocumentId,
}: DivisionAssignmentsPanelProps) {
  const idPrefix = useId();

  const {
    shown,
    query,
    drafts,
    items,
    takenCount,
    isBusy,
    isSubmitting,
    isFormOpen,
    confirmId,
    busyId,
    discardPrompt,
    requestClose,
    finishClose,
    keepEditing,
    submit,
    requestDelete,
    confirmDelete,
    cancelConfirm,
  } = useDivisionAssignmentsPanel({ row, incomingDocumentId, onClose });

  const pendingCount = Math.max(0, items.length - takenCount);

  const body = (
    <div className="space-y-6">
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        What this division has been asked to do on this document, and what it has done so
        far.
      </p>

      {discardPrompt && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-500/30 dark:bg-warning-500/10"
        >
          <p className="text-theme-sm text-warning-700 dark:text-warning-400">
            You have unsaved notices. Discard them?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={keepEditing}
              className={`${secondaryButton} !px-3 !py-1.5`}
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={finishClose}
              className={`${primaryButton} !px-3 !py-1.5`}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {query.isLoading ? (
        <SkeletonTheme baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT}>
          <div
            role="status"
            aria-busy="true"
            aria-label="Loading assignments"
            className="space-y-3"
          >
            <Skeleton height={44} />
            <Skeleton height={104} borderRadius={12} />
            <Skeleton height={104} borderRadius={12} />
          </div>
        </SkeletonTheme>
      ) : query.isError ? (
        <div className={`${cardClass} space-y-3 text-center`} role="alert">
          <p className="text-theme-sm text-gray-600 dark:text-gray-300">
            Couldn't load the assignments.
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="rounded text-theme-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <dl className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-white/8">
              <Stat label="Assignments" value={items.length} />
              <Stat label="Actions taken" value={takenCount} />
              <Stat label="Pending actions" value={pendingCount} />
            </dl>
          )}

          {isDocComplete && (
            <p
              role="note"
              className="rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-500 dark:bg-white/3 dark:text-gray-400"
            >
              {COMPLETE_HINT}
            </p>
          )}

          {isFormOpen && (
            <DetailSection title="New notices of action">
              <NoticeOfActionEditor
                idPrefix={idPrefix}
                notices={drafts.notices}
                noticeErrors={drafts.noticeErrors}
                lastAddedKey={drafts.lastAddedKey}
                canAdd={drafts.canAdd}
                max={drafts.max}
                disabled={isSubmitting}
                onAdd={drafts.add}
                onUpdate={drafts.update}
                onRemove={drafts.remove}
              />
            </DetailSection>
          )}

          {items.length === 0 ? (
            !isFormOpen && (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-white/8">
                <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  No notices of action yet
                </p>
                <p className="mx-auto mt-1 max-w-xs text-theme-xs text-gray-500 dark:text-gray-400">
                  Add the actions this division needs to take on this document.
                </p>
              </div>
            )
          ) : (
            <ul className="space-y-3">
              {items.map((a) => {
                const isComplete = a.status === "COMPLETE";
                const confirming = confirmId === a.id;

                return (
                  <li
                    key={a.id}
                    className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-white/8"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
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
                          onClick={() => requestDelete(a)}
                          disabled={isDocComplete || isBusy || confirming}
                          title={isDocComplete ? COMPLETE_HINT : undefined}
                          aria-label={`Delete notice of action: ${a.notice_of_action}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-error-50 hover:text-error-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <p className="mb-1.5 text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          Added by
                        </p>
                        <UserTag person={a.created_by} size="md" showPosition />
                      </div>
                      <time
                        dateTime={a.created_at}
                        className="text-theme-xs text-gray-500 dark:text-gray-400"
                      >
                        {formatDateTime(a.created_at)}
                      </time>
                    </div>

                    {isComplete && a.action_taken && (
                      <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/3">
                        <p className="wrap-break-word whitespace-pre-line text-theme-sm text-gray-800 dark:text-white/90">
                          {a.action_taken}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-200/70 pt-3 dark:border-white/8">
                          <div className="min-w-0">
                            <p className="mb-1.5 text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                              Action taken by
                            </p>
                            <UserTag person={a.action_taken_by} size="md" showPosition />
                          </div>
                          {a.action_taken_at && (
                            <time
                              dateTime={a.action_taken_at}
                              className="text-theme-xs text-gray-500 dark:text-gray-400"
                            >
                              {formatDateTime(a.action_taken_at)}
                            </time>
                          )}
                        </div>
                      </div>
                    )}

                    {confirming && (
                      <div
                        role="alert"
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 dark:border-error-500/30 dark:bg-error-500/10"
                      >
                        <p className="text-theme-xs text-error-700 dark:text-error-400">
                          {confirmMessage(a.status)}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={cancelConfirm}
                            disabled={busyId === a.id}
                            className={`${secondaryButton} !px-3 !py-1.5`}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void confirmDelete(a)}
                            disabled={busyId === a.id}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-error-500 px-3 py-1.5 text-theme-sm font-medium text-white transition hover:bg-error-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-error-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyId === a.id ? "Deleting…" : "Delete notice"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );

  const footer = isDocComplete ? undefined : isFormOpen ? (
    <>
      <button
        type="button"
        onClick={drafts.reset}
        disabled={isSubmitting}
        className={secondaryButton}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={isSubmitting}
        className={primaryButton}
      >
        {isSubmitting
          ? "Adding…"
          : `Add ${drafts.notices.length} ${drafts.notices.length === 1 ? "notice" : "notices"}`}
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={drafts.add}
      disabled={query.isLoading || query.isError}
      className={primaryButton}
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add notice of action
    </button>
  );

  return (
    <DetailPanel
      isOpen={row !== null}
      onClose={requestClose}
      eyebrow="Routed division"
      title={shown?.division_name ?? ""}
      size="lg"
      closeDisabled={isBusy}
      body={body}
      footer={footer}
    />
  );
}
