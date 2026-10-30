import { Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  errorClass,
  inputBorder,
  inputClass,
  labelClass,
  secondaryButton,
} from "../detials-page/detial-panel-form-style-constant";
import type { NoticeDraft } from "../detials-page/hooks/use-notice-drafts";

interface NoticeOfActionEditorProps {
  notices: NoticeDraft[];
  noticeErrors: Record<number, string>;
  /** Key of the most recently added draft; its input receives focus. */
  lastAddedKey: number | null;
  canAdd: boolean;
  max: number;
  disabled?: boolean;
  /** Prefix for generated DOM ids; must be unique per mounted editor. */
  idPrefix: string;
  onAdd: () => void;
  onUpdate: (
    key: number,
    patch: Partial<Pick<NoticeDraft, "noticeOfAction" | "noticeDescription">>,
  ) => void;
  onRemove: (key: number) => void;
}

/**
 * Presentational list of notice-of-action fields plus the "add another" button.
 * Shared by AssignDivisionModal and DivisionAssignmentsPanel. Owns no state;
 * pair it with `useNoticeDrafts`.
 */
export default function NoticeOfActionEditor({
  notices,
  noticeErrors,
  lastAddedKey,
  canAdd,
  max,
  disabled = false,
  idPrefix,
  onAdd,
  onUpdate,
  onRemove,
}: NoticeOfActionEditorProps) {
  const lastAddedInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lastAddedKey !== null) lastAddedInputRef.current?.focus();
  }, [lastAddedKey]);

  return (
    <div className="space-y-3">
      {notices.length > 0 && (
        <ul className="space-y-3">
          {notices.map((notice, index) => {
            const noticeId = `${idPrefix}-notice-${notice.key}`;
            const descId = `${idPrefix}-desc-${notice.key}`;
            const errorId = `${noticeId}-error`;
            const error = noticeErrors[notice.key];
            const position = index + 1;

            return (
              <li
                key={notice.key}
                className="rounded-xl border border-gray-200 p-3 dark:border-white/8"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <label htmlFor={noticeId} className={labelClass}>
                        Notice of action {position}{" "}
                        <span className="text-error-500">*</span>
                      </label>
                      <input
                        id={noticeId}
                        type="text"
                        value={notice.noticeOfAction}
                        onChange={(e) =>
                          onUpdate(notice.key, { noticeOfAction: e.target.value })
                        }
                        ref={notice.key === lastAddedKey ? lastAddedInputRef : undefined}
                        placeholder="e.g. For appropriate action"
                        disabled={disabled}
                        aria-required="true"
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        className={`mt-1 h-10 ${inputClass} ${inputBorder(!!error)}`}
                      />
                      {error && (
                        <p id={errorId} role="alert" className={errorClass}>
                          {error}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor={descId} className={labelClass}>
                        Description {position}
                      </label>
                      <textarea
                        id={descId}
                        rows={2}
                        value={notice.noticeDescription}
                        onChange={(e) =>
                          onUpdate(notice.key, { noticeDescription: e.target.value })
                        }
                        placeholder="Add details or instructions"
                        disabled={disabled}
                        className={`mt-1 resize-none py-2 ${inputClass} ${inputBorder(false)}`}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(notice.key)}
                    disabled={disabled}
                    aria-label={`Remove notice of action ${position}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-gray-200"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd || disabled}
          className={`${secondaryButton} ${
            notices.length === 0 ? "w-full border-dashed py-3" : ""
          }`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {notices.length === 0
            ? "Add a notice of action"
            : "Add another notice of action"}
        </button>
        {notices.length > 0 && (
          <span className="text-theme-xs text-gray-400 dark:text-gray-500">
            {notices.length} of {max}
          </span>
        )}
      </div>
    </div>
  );
}
