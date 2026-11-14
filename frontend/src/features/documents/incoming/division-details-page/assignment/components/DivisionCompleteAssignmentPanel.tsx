import { TriangleAlert } from "lucide-react";
import type { IncomingDocumentAssignment } from "../../../detials-page/assignment/types/incoming-document-assignment";
import {
  errorClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "../../../shared/detial-panel-form-style-constant";
import { useDivisionCompleteAssignmentPanel } from "../hooks/use-complete-division-assignment-panel";

interface DivisionCompleteAssignmentPanelProps {
  incomingDocumentId: string;
  assignment: IncomingDocumentAssignment;
  panelId: string;
  onCancel: () => void;
  /** Call after the action was saved successfully (closes the panel). */
  onCompleted: () => void;
}

/**
 * Inline "Submit action" panel for a division's own assignment.
 * Layout only: state and the API call live in
 * `useDivisionCompleteAssignmentPanel`. Styling mirrors the admin
 * `CompleteAssignmentPanel`.
 */
export default function DivisionCompleteAssignmentPanel({
  incomingDocumentId,
  assignment,
  panelId,
  onCancel,
  onCompleted,
}: DivisionCompleteAssignmentPanelProps) {
  const {
    fieldId,
    textareaRef,
    actionTaken,
    handleChange,
    handleSubmit,
    showError,
    isPending,
    maxLength,
  } = useDivisionCompleteAssignmentPanel({
    incomingDocumentId,
    assignmentId: assignment.id,
    onCompleted,
  });

  const counterId = `${fieldId}-counter`;
  const errorId = `${fieldId}-error`;
  const warningId = `${fieldId}-warning`;

  return (
    <form
      id={panelId}
      aria-label={`Submit action for ${assignment.notice_of_action}`}
      aria-busy={isPending}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/3"
    >
      <label htmlFor={fieldId} className={labelClass}>
        Action taken <span className="text-error-500">*</span>
      </label>

      <textarea
        ref={textareaRef}
        id={fieldId}
        value={actionTaken}
        onChange={handleChange}
        maxLength={maxLength}
        rows={4}
        disabled={isPending}
        aria-required="true"
        aria-invalid={showError ? true : undefined}
        aria-describedby={
          showError ? `${counterId} ${errorId} ${warningId}` : `${counterId} ${warningId}`
        }
        placeholder="Describe the action your division took…"
        className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:opacity-60 dark:bg-gray-900 dark:text-white/90 ${
          showError ? "border-error-500" : "border-gray-200 dark:border-white/8"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showError && (
            <p id={errorId} role="alert" className={errorClass}>
              Enter the action taken before submitting.
            </p>
          )}
        </div>
        <p
          id={counterId}
          className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400"
        >
          {actionTaken.length}/{maxLength}
        </p>
      </div>

      {/*
        Irreversibility notice. Static (not role="alert") so it isn't announced
        every time the panel opens; it's read when the textarea or the submit
        button receives focus, via aria-describedby.
      */}
      <div
        id={warningId}
        className="flex gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10"
      >
        <TriangleAlert
          className="mt-0.5 h-5 w-5 shrink-0 text-warning-600 dark:text-warning-400"
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-0.5">
          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
            This can't be undone
          </p>
          <p className="text-theme-xs text-gray-600 dark:text-gray-300">
            Once completed,{" "}
            <span className="font-medium">{assignment.notice_of_action}</span> can't be
            edited or deleted. Review your action taken before you continue.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className={`${secondaryButton} !px-3 !py-1.5`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          aria-describedby={warningId}
          className={`${primaryButton} !px-3 !py-1.5`}
        >
          {isPending ? "Submitting…" : "Submit and complete"}
        </button>
      </div>
    </form>
  );
}
