import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Modal from "../../../../../../components/Modal";
import type { IncomingDraft } from "../../../helpers/incoming-helpers";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary";
const secondaryBtn =
  "px-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 transition disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/8 dark:bg-white/3 dark:text-gray-200";

interface Props {
  draft: IncomingDraft;
  /** How many fields the reviewer edited (shown as a hint). */
  editedCount: number;
  isSaving: boolean;
  /** null = confirmation view; set = the document was created (success view). */
  savedCode: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  /** Success view: reset the wizard for another upload. */
  onSaveAnother: () => void;
  /** Success view: hide the "Upload another" button (e.g. when reviewing from the queue). */
  hideSaveAnother?: boolean;
  /** Success view: go to the incoming list. */
  onGoToIncoming: () => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 line-clamp-3 break-words text-theme-sm text-gray-800 dark:text-white/90">
        {value}
      </dd>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard unavailable (e.g. insecure context): the code is still selectable. */
    }
  };

  return (
    <button type="button" className={`${secondaryBtn} shrink-0`} onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function SaveIncomingModal({
  draft,
  editedCount,
  isSaving,
  savedCode,
  onCancel,
  onConfirm,
  onSaveAnother,
  hideSaveAnother = false,
  onGoToIncoming,
}: Props) {
  const saved = savedCode !== null;

  const submit = () => {
    if (saved || isSaving) return;
    onConfirm();
  };

  // Screen-reader announcement for both state changes (saving -> saved).
  const statusText = saved
    ? `Document saved. Document code ${savedCode}.`
    : isSaving
      ? "Saving document"
      : "";

  return (
    <Modal
      size="md"
      // After saving, closing (X / Esc / backdrop) must not leave the user on a
      // review screen for a document that already exists, so it starts a new upload.
      onClose={saved ? onSaveAnother : onCancel}
      closeDisabled={isSaving}
      onSubmit={submit}
      header={
        <div>
          <h3 className="text-theme-lg font-semibold text-gray-800 dark:text-white/90">
            {saved ? "Document saved" : "Save incoming document"}
          </h3>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {saved
              ? "It is now in the Incoming list."
              : "Review the details below, then confirm to save."}
          </p>
        </div>
      }
      body={
        <div className="space-y-5">
          <div role="status" aria-live="polite" className="sr-only">
            {statusText}
          </div>

          {saved ? (
            <>
              <div className="flex flex-col items-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
                  <Check className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                </span>
                <p className="mt-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                  Saved successfully
                </p>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  Keep this code to find or reference the document.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/8 dark:bg-white/3">
                <div className="min-w-0">
                  <p className="text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Document code
                  </p>
                  <p className="mt-0.5 select-all break-all font-mono text-theme-lg font-semibold text-gray-800 dark:text-white/90">
                    {savedCode}
                  </p>
                </div>
                <CopyButton text={savedCode ?? ""} />
              </div>

              <dl className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-white/8">
                <SummaryRow label="From" value={draft.documentFrom} />
                <SummaryRow label="Subject" value={draft.subject} />
              </dl>
            </>
          ) : (
            <dl className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/3">
              <SummaryRow label="From" value={draft.documentFrom} />
              <SummaryRow label="Recipient" value={draft.recipient} />
              <SummaryRow label="Subject" value={draft.subject} />
              <SummaryRow label="Date received" value={draft.dateReceived} />
              <SummaryRow label="Summary" value={draft.summary} />
              {editedCount > 0 && (
                <p className="text-theme-xs text-secondary">
                  Includes {editedCount} reviewer {editedCount === 1 ? "edit" : "edits"}
                </p>
              )}
            </dl>
          )}
        </div>
      }
      footer={
        saved ? (
          <>
            {!hideSaveAnother && (
              <button type="button" className={secondaryBtn} onClick={onSaveAnother}>
                Upload another
              </button>
            )}
            {/* autoFocus: the Save button that had focus is gone, so land focus here. */}
            <button
              type="button"
              className={primaryBtn}
              onClick={onGoToIncoming}
              // biome-ignore lint/a11y/noAutofocus: restores focus after the view swap
              autoFocus
            >
              Go to Incoming
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={secondaryBtn}
              disabled={isSaving}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="submit" className={primaryBtn} disabled={isSaving}>
              {isSaving && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {isSaving ? "Saving..." : "Save"}
            </button>
          </>
        )
      }
    />
  );
}
