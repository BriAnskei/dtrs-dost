import type { FieldKey } from "../types/extraction-types";

/** Fields edited with the date picker instead of a text box. */
export const DATE_FIELDS: ReadonlySet<FieldKey> = new Set<FieldKey>([
  "dateReceived",
  "datePrepared",
]);

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_NAME = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?/i;
const FOUR_DIGIT_YEAR = /\b\d{4}\b/;
const DAY_NUMBER = /\b\d{1,2}(?:st|nd|rd|th)?\b/;

const pad = (n: number) => String(n).padStart(2, "0");

/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-31). */
export function isIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/**
 * Best-effort YYYY-MM-DD for an extracted date.
 * - Already ISO: returned as is.
 * - Written out ("October 15, 2026", "15 Oct 2026"): converted.
 * - Anything else (including 03/04/2026, where day/month order is ambiguous):
 *   returned trimmed and unchanged, so the reviewer picks the date themselves.
 */
export function normalizeDate(raw: string): string {
  const v = raw.trim();
  if (isIsoDate(v)) return v;
  // Needs month name + day + year, so a month-only "May 2026" is never guessed as May 1.
  if (MONTH_NAME.test(v) && DAY_NUMBER.test(v) && FOUR_DIGIT_YEAR.test(v)) {
    const t = new Date(v);
    if (!Number.isNaN(t.getTime())) {
      return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    }
  }
  return v;
}
