import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DatePicker from "../../../../../../components/form/date-picker";
import Label from "../../../../../../components/form/Label";
import Modal from "../../../../../../components/Modal";
import { type OutgoingDraft, todayLocal } from "../../../helpers/outgoing-helpers";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary";
const secondaryBtn =
  "px-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 transition disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/8 dark:bg-white/3 dark:text-gray-200";
const inputCls =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

interface Props {
  draft: OutgoingDraft;
  /** How many fields the reviewer edited (shown as a hint). */
  editedCount: number;
  isSaving: boolean;
  /** null = form view; set = the document was created (success view). */
  savedCode: string | null;
  onCancel: () => void;
  onConfirm: (received: { dateReceived: string; receivedBy: string }) => void;
  /** Success view: reset the wizard for another upload. */
  onSaveAnother: () => void;
  /** Success view: go to the outgoing list. */
  onGoToOutgoing: () => void;
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

export default function SaveOutgoingModal({
  draft,
  editedCount,
  isSaving,
  savedCode,
  onCancel,
  onConfirm,
  onSaveAnother,
  onGoToOutgoing,
}: Props) {
  // Default = today on the client (local date). The user can change it.
  const [dateReceived, setDateReceived] = useState(todayLocal);
  const [receivedBy, setReceivedBy] = useState("");

  const saved = savedCode !== null;
  const valid = !!dateReceived && receivedBy.trim().length > 0;

  const submit = () => {
    if (saved || !valid || isSaving) return;
    onConfirm({ dateReceived, receivedBy: receivedBy.trim() });
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
            {saved ? "Document saved" : "Save outgoing document"}
          </h3>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {saved
              ? "It is now in the Outgoing list."
              : "Confirm the receiving details to finish."}
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
                <SummaryRow label="To" value={draft.to} />
                <SummaryRow label="Subject" value={draft.subject} />
                <SummaryRow label="Received by" value={receivedBy.trim()} />
              </dl>
            </>
          ) : (
            <>
              <dl className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/3">
                <SummaryRow label="To" value={draft.to} />
                <SummaryRow label="Subject" value={draft.subject} />
                <SummaryRow label="Date prepared" value={draft.datePrepared} />
                <SummaryRow label="Summary" value={draft.summary} />
                {editedCount > 0 && (
                  <p className="text-theme-xs text-secondary">
                    Includes {editedCount} reviewer {editedCount === 1 ? "edit" : "edits"}
                  </p>
                )}
              </dl>

              <DatePicker
                id="outgoing-date-received"
                label="Date received"
                placeholder="YYYY-MM-DD"
                value={dateReceived}
                allowInput
                appendToBody
                disabled={isSaving}
                onChange={(_dates, dateStr) => setDateReceived(dateStr)}
              />

              <div>
                <Label htmlFor="outgoing-received-by">Received by</Label>
                <input
                  id="outgoing-received-by"
                  type="text"
                  value={receivedBy}
                  maxLength={255}
                  disabled={isSaving}
                  placeholder="Name of the person who received it"
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className={inputCls}
                />
              </div>
            </>
          )}
        </div>
      }
      footer={
        saved ? (
          <>
            <button type="button" className={secondaryBtn} onClick={onSaveAnother}>
              Upload another
            </button>
            {/* autoFocus: the Save button that had focus is gone, so land focus here. */}
            <button
              type="button"
              className={primaryBtn}
              onClick={onGoToOutgoing}
              // biome-ignore lint/a11y/noAutofocus: restores focus after the view swap
              autoFocus
            >
              Go to Outgoing
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
            <button type="submit" className={primaryBtn} disabled={!valid || isSaving}>
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
