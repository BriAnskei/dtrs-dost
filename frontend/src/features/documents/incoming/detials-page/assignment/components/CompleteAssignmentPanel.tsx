import { type KeyboardEvent, useEffect, useId, useRef } from "react";
import {
  errorClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "../../../shared/detial-panel-form-style-constant";
import {
  ACTION_TAKEN_MAX,
  useCompleteAssignmentForm,
} from "../hooks/use-complete-assignment-form";
import type { IncomingDocumentAssignment } from "../types/incoming-document-assignment";

interface CompleteAssignmentPanelProps {
  incomingDocumentId: string;
  assignment: IncomingDocumentAssignment;
  /** DOM id, so the row's button can point at it with aria-controls. */
  panelId: string;
  onCancel: () => void;
  onCompleted: () => void;
}

/**
 * Inline panel under a notice row: records the action taken and completes the
 * notice. Mount only while open. State and the API call live in
 * `useCompleteAssignmentForm`; this file is layout only.
 */
export default function CompleteAssignmentPanel({
  incomingDocumentId,
  assignment,
  panelId,
  onCancel,
  onCompleted,
}: CompleteAssignmentPanelProps) {
  const f = useCompleteAssignmentForm({ incomingDocumentId, assignment, onCompleted });

  const id = useId();
  const textareaId = `${id}-action-taken`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Land in the field as soon as the panel opens.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (f.isSubmitting) return;
    // Ctrl/Cmd + Enter submits. Plain Enter stays a newline.
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      formRef.current?.requestSubmit();
      return;
    }
    // Escape closes only an empty panel, so a stray key never throws away typed text.
    if (e.key === "Escape" && f.isEmpty) {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <form
      ref={formRef}
      id={panelId}
      aria-label="Record action taken"
      onSubmit={(e) => {
        e.preventDefault();
        void f.submit();
      }}
      className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/3"
    >
      <label htmlFor={textareaId} className={labelClass}>
        Action taken <span className="text-error-500">*</span>
      </label>

      <textarea
        ref={textareaRef}
        id={textareaId}
        value={f.text}
        onChange={(e) => f.change(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={ACTION_TAKEN_MAX}
        rows={4}
        disabled={f.isSubmitting}
        aria-required="true"
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.error ? `${counterId} ${errorId}` : counterId}
        placeholder="What was done to address this notice?"
        className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:opacity-60 dark:bg-gray-900 dark:text-white/90 ${
          f.error ? "border-error-500" : "border-gray-200 dark:border-white/8"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {f.error && (
            <p id={errorId} role="alert" className={errorClass}>
              {f.error}
            </p>
          )}
        </div>
        <p
          id={counterId}
          className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400"
        >
          {f.length}/{ACTION_TAKEN_MAX}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          Once completed, this notice can't be edited or deleted.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={f.isSubmitting}
            className={`${secondaryButton} !px-3 !py-1.5`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={f.isSubmitting || !f.canComplete}
            className={`${primaryButton} !px-3 !py-1.5`}
          >
            {f.isSubmitting ? "Completing…" : "Mark as complete"}
          </button>
        </div>
      </div>
    </form>
  );
}
