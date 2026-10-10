import { FIELD_LABELS } from "../constans";
import type { FieldKey, ResultRow } from "../types/extraction-types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD. Do NOT use toISOString(): in UTC+8 it returns yesterday before 8 AM. */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Normalizes whatever the LLM / reviewer typed into YYYY-MM-DD, or null if it isn't a real date. */
export function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);

  if (Number.isNaN(d.getTime())) return null;
  // e.g. 2026-02-31 rolls over to March: reject it
  if (m && d.getMonth() !== Number(m[2]) - 1) return null;

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Reviewer edit wins over the extracted value. */
export function getFinalFieldValue(
  row: ResultRow,
  edits: Partial<Record<FieldKey, string>>,
): string {
  const value = row.field in edits ? (edits[row.field] ?? "") : (row.value ?? "");
  return value.trim();
}

export interface OutgoingDraft {
  to: string;
  subject: string;
  summary: string;
  /** YYYY-MM-DD, or "" when missing / not a valid date */
  datePrepared: string;
  /** Human-readable reasons Save is blocked. Empty = ready. */
  issues: string[];
}

// Backend limits (CreateOutgoingDocumentDto)
const MAX = { to: 255, subject: 500, summary: 2000 } as const;

export function buildOutgoingDraft(
  rows: ResultRow[],
  edits: Partial<Record<FieldKey, string>>,
): OutgoingDraft {
  const get = (field: FieldKey) => {
    const row = rows.find((r) => r.field === field);
    return row ? getFinalFieldValue(row, edits) : "";
  };

  const to = get("to");
  const subject = get("subject");
  const summary = get("summary");
  const rawDate = get("datePrepared");
  const datePrepared = toIsoDate(rawDate) ?? "";

  const issues: string[] = [];
  const need = (ok: boolean, field: FieldKey, msg?: string) => {
    if (!ok) issues.push(msg ?? `${FIELD_LABELS[field]} is required`);
  };

  need(!!to, "to");
  need(!!subject, "subject");
  need(!!summary, "summary");
  need(
    !!datePrepared,
    "datePrepared",
    rawDate
      ? `${FIELD_LABELS.datePrepared} isn't a valid date (use YYYY-MM-DD)`
      : undefined,
  );

  if (to.length > MAX.to) issues.push(`${FIELD_LABELS.to} is over ${MAX.to} characters`);
  if (subject.length > MAX.subject)
    issues.push(`${FIELD_LABELS.subject} is over ${MAX.subject} characters`);
  if (summary.length > MAX.summary)
    issues.push(`${FIELD_LABELS.summary} is over ${MAX.summary} characters`);

  return { to, subject, summary, datePrepared, issues };
}
