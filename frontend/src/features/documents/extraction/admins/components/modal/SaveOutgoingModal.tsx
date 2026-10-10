import { useState } from "react";
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

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      className="opacity-25"
    />
    <path
      d="M4 12a8 8 0 018-8"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

interface Props {
  draft: OutgoingDraft;
  /** How many fields the reviewer edited (shown as a hint). */
  editedCount: number;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: (received: { dateReceived: string; receivedBy: string }) => void;
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

export default function SaveOutgoingModal({
  draft,
  editedCount,
  isSaving,
  onCancel,
  onConfirm,
}: Props) {
  // Default = today on the client (local date). The user can change it.
  const [dateReceived, setDateReceived] = useState(todayLocal);
  const [receivedBy, setReceivedBy] = useState("");

  const valid = !!dateReceived && receivedBy.trim().length > 0;

  const submit = () => {
    if (!valid || isSaving) return;
    onConfirm({ dateReceived, receivedBy: receivedBy.trim() });
  };

  return (
    <Modal
      size="md"
      onClose={onCancel}
      closeDisabled={isSaving}
      onSubmit={submit}
      header={
        <div>
          <h3 className="text-theme-lg font-semibold text-gray-800 dark:text-white/90">
            Save outgoing document
          </h3>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            Confirm the receiving details to finish.
          </p>
        </div>
      }
      body={
        <div className="space-y-5">
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
        </div>
      }
      footer={
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
            {isSaving && <Spinner />}
            {isSaving ? "Saving..." : "Save"}
          </button>
        </>
      }
    />
  );
}
