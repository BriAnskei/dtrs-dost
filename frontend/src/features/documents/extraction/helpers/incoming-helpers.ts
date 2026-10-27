import { FIELD_LABELS } from "../constans";
import type { FieldKey, ResultRow } from "../types/extraction-types";
import { isIsoDate, normalizeDate } from "./date-helpers";

/**
 * Extraction field keys for the "incoming" direction.
 * ⚠ If your FieldKey names differ, change ONLY the right-hand values here.
 * `satisfies` makes TypeScript flag any key that isn't a real FieldKey.
 */
const KEYS = {
  subject: "subject",
  documentFrom: "from",
  recipient: "to",
  dateReceived: "dateReceived",
  summary: "summary",
} as const satisfies Record<string, FieldKey>;

export interface IncomingDraft {
  subject: string;
  documentFrom: string;
  recipient: string;
  /** YYYY-MM-DD */
  dateReceived: string;
  summary: string;
  /** Reasons the document can't be saved yet (empty = ready). */
  issues: string[];
}

/**
 * Final values for the incoming save: the reviewer's edit wins over the
 * extracted value. Every field is required by the backend.
 */
export function buildIncomingDraft(
  rows: ResultRow[],
  edits: Partial<Record<FieldKey, string>>,
): IncomingDraft {
  const fieldValue = (field: FieldKey): string => {
    if (field in edits) return (edits[field] ?? "").trim();
    return (rows.find((r) => r.field === field)?.value ?? "").trim();
  };

  const draft = {
    documentFrom: fieldValue(KEYS.documentFrom),
    recipient: fieldValue(KEYS.recipient),
    subject: fieldValue(KEYS.subject),
    // "October 15, 2026" -> "2026-10-15"; anything ambiguous is left for the reviewer.
    dateReceived: normalizeDate(fieldValue(KEYS.dateReceived)),
    summary: fieldValue(KEYS.summary),
  };

  const issues: string[] = [];

  const required: [FieldKey, string][] = [
    [KEYS.documentFrom, draft.documentFrom],
    [KEYS.recipient, draft.recipient],
    [KEYS.subject, draft.subject],
    [KEYS.dateReceived, draft.dateReceived],
    [KEYS.summary, draft.summary],
  ];

  for (const [field, value] of required) {
    if (!value) issues.push(`${FIELD_LABELS[field]} is empty`);
  }

  if (draft.dateReceived && !isIsoDate(draft.dateReceived)) {
    issues.push(
      `${FIELD_LABELS[KEYS.dateReceived]} isn't a valid date, pick it with the pencil`,
    );
  }

  return { ...draft, issues };
}
