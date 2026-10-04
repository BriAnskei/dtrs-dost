import { useRef, useState } from "react";
import { CHUNK_LEVEL_FIELDS, FIELD_LABELS } from "../constans";
import type { ChunkLocation, ResultRow } from "../types/extraction-types";

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

const inputCls =
  "min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-theme-sm text-gray-800 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 dark:border-white/8 dark:bg-white/3 dark:text-white/90";

const iconBtn =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-secondary/40 hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 dark:border-white/8 dark:bg-white/3 dark:text-gray-300";

const svgProps = {
  className: "h-3.5 w-3.5",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 2,
  "aria-hidden": true,
} as const;

const PencilIcon = () => (
  <svg {...svgProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
    />
  </svg>
);
const CheckIcon = () => (
  <svg {...svgProps} strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const XIcon = () => (
  <svg {...svgProps} strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export default function ReviewFieldDetail({
  row,
  locations,
  editedValue,
  onEdit,
}: {
  row: ResultRow;
  locations: ChunkLocation[];
  /** undefined = untouched */
  editedValue: string | undefined;
  /** string = new value, null = revert to the extracted value */
  onEdit: (value: string | null) => void;
}) {
  // A field can span pages, so show each distinct page once
  const pages = [...new Set(locations.map((l) => l.page))].join(", ");
  const isEdited = editedValue !== undefined;
  const current = editedValue ?? row.value ?? "";
  const multiline = CHUNK_LEVEL_FIELDS.has(row.field);
  const label = FIELD_LABELS[row.field];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // Guards against committing twice (e.g. Enter, then the blur caused by unmounting).
  const doneRef = useRef(true);

  const startEdit = () => {
    setDraft(current);
    doneRef.current = false;
    setEditing(true);
  };

  const finish = (commit: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (commit) {
      // Typing the extracted value back in is the same as no edit.
      onEdit(draft.trim() === (row.value ?? "").trim() ? null : draft);
    }
    setEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    } else if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      finish(true);
    }
  };

  // Keep focus in the field while the buttons are pressed, so the blur-to-save
  // below doesn't fire before Save / Cancel get their click.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  const fieldProps = {
    "aria-label": label,
    value: draft,
    autoFocus: true,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      e.currentTarget.select(),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onKeyDown,
    onBlur: () => finish(true), // leaving the field (e.g. picking another card) keeps the edit
    className: inputCls,
  };

  return (
    <div className="shrink-0 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {!editing && (
          <div className="flex items-center gap-2">
            {isEdited && (
              <button
                type="button"
                onClick={() => onEdit(null)}
                className="text-theme-xs text-secondary hover:underline"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              className={iconBtn}
              onClick={startEdit}
              title={`Edit ${label}`}
              aria-label={`Edit ${label}`}
            >
              <PencilIcon />
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="flex items-start gap-2">
          {multiline ? (
            <textarea rows={3} {...fieldProps} className={`${inputCls} resize-y`} />
          ) : (
            <input type="text" {...fieldProps} />
          )}
          <button
            type="button"
            className={iconBtn}
            onMouseDown={keepFocus}
            onClick={() => finish(true)}
            title={multiline ? "Save (Ctrl+Enter)" : "Save (Enter)"}
            aria-label="Save change"
          >
            <CheckIcon />
          </button>
          <button
            type="button"
            className={iconBtn}
            onMouseDown={keepFocus}
            onClick={() => finish(false)}
            title="Cancel (Esc)"
            aria-label="Cancel change"
          >
            <XIcon />
          </button>
        </div>
      )}

      {row.value === null ? (
        <p className="text-theme-xs text-danger">
          Not found by the LLM. Use the pencil to enter it, or scroll the document to look
          for it.
        </p>
      ) : (
        <>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {locations.length > 0
              ? `${locations.length > 1 ? "Pages" : "Page"} ${pages} · ${row.chunkIds.join(", ")}`
              : "No location available"}{" "}
            · AI {pct(row.aiConfidence)} × Source {pct(row.sourceConfidence)} ={" "}
            <span className="font-semibold">{pct(row.effectiveConfidence)}</span>
          </p>
          {locations.length > 0 && (
            <p className="line-clamp-2 border-l-2 border-accent pl-2 text-theme-xs italic text-gray-700 dark:text-gray-300">
              {locations.map((l) => l.text).join(" ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
