import { ClipboardCheck } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import type { IncomingDocumentAssignment } from "../../../detials-page/assignment/types/incoming-document-assignment";
import {
  primaryButton,
  secondaryButton,
} from "../../../shared/detial-panel-form-style-constant";

interface DivisionCompleteAssignmentPanelProps {
  assignment: IncomingDocumentAssignment;
  panelId: string;
  onCancel: () => void;
  /** Call after the action was saved successfully (closes the panel). */
  onCompleted: () => void;
}

/**
 * Inline "Submit action" panel for a division's own assignment.
 *
 * UI only for now. The submit handler is a TODO: it still needs the
 * division endpoint + a mutation hook (see the TODO in `handleSubmit`).
 */
export default function DivisionCompleteAssignmentPanel({
  assignment,
  panelId,
  onCancel,
}: DivisionCompleteAssignmentPanelProps) {
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [showError, setShowError] = useState(false);

  // Move focus into the panel when it opens.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const value = actionTaken.trim();
    if (!value) {
      setShowError(true);
      textareaRef.current?.focus();
      return;
    }

    // TODO(submit-action): implement the division "submit action" call.
    //  1. Add a service method, e.g.
    //     DivisionIncomingDocumentService.completeDivisionAssignment(
    //       incomingDocumentId, assignment.id, { action_taken: value })
    //  2. Wrap it in a mutation hook (useMutation) and use it here instead of
    //     this stub. Disable the buttons and show "Submitting…" while pending,
    //     and show an inline error (role="alert") if it fails.
    //  3. On success: invalidate
    //     ["division-incoming-document-assignments", incomingDocumentId]
    //     (and ["division-incoming-document-details", incomingDocumentId] so
    //     the progress card counts update), then call `onCompleted()`.
    void value;
  };

  return (
    <form
      id={panelId}
      onSubmit={handleSubmit}
      noValidate
      aria-label={`Submit action for ${assignment.notice_of_action}`}
      className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/3 sm:p-4"
    >
      <div className="space-y-1.5">
        <label
          htmlFor={fieldId}
          className="block text-theme-sm font-medium text-gray-800 dark:text-white/90"
        >
          Action taken
        </label>
        <textarea
          ref={textareaRef}
          id={fieldId}
          value={actionTaken}
          onChange={(e) => {
            setActionTaken(e.target.value);
            if (showError) setShowError(false);
          }}
          rows={4}
          placeholder="Describe the action your division took…"
          aria-invalid={showError}
          aria-describedby={showError ? `${fieldId}-error` : undefined}
          className={`w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 dark:text-white/90 sm:text-theme-sm ${
            showError ? "border-error-500" : "border-gray-200 dark:border-white/8"
          }`}
        />
        {showError && (
          <p
            id={`${fieldId}-error`}
            role="alert"
            className="text-theme-xs text-error-600 dark:text-error-400"
          >
            Enter the action taken before submitting.
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={`${secondaryButton} min-h-11 w-full justify-center sm:min-h-0 sm:w-auto`}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`${primaryButton} min-h-11 w-full justify-center sm:min-h-0 sm:w-auto`}
        >
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          Submit action
        </button>
      </div>
    </form>
  );
}
