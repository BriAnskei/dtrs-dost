/**
 * Unit tests for `outgoing-helpers` (helpers/outgoing-helpers.ts).
 *
 * PURE FUNCTIONS UNDER TEST:
 *
 *   toIsoDate(raw: string): string | null
 *     - Trims input, parses via Date, rejects NaN and calendar-invalid ISO
 *       dates (e.g. 2026-02-31 → null). Returns the normalized YYYY-MM-DD
 *       string or null when unparseable.
 *     - Important: does NOT use toISOString() — that returns the wrong
 *       local date in UTC+ timezones before 8 AM local.
 *
 *   getFinalFieldValue(row: ResultRow, edits): string
 *     - Returns the reviewer's edit if the row's field key is in `edits`,
 *       otherwise the row's extracted `value`. Both are trimmed.
 *
 *   todayLocal(): string
 *     - Returns today's date as YYYY-MM-DD in the LOCAL timezone.
 *
 *   buildOutgoingDraft(rows, edits): OutgoingDraft
 *     - Joins LLM rows with reviewer edits (edit wins) into final values.
 *     - `datePrepared` is normalized via `toIsoDate`: invalid → "".
 *     - `issues` flags: empty `to`, empty `subject`, empty `summary`,
 *       missing/invalid `datePrepared`.
 *     - Length limits enforced (to: 255, subject: 500, summary: 2000).
 */

import { describe, expect, it, vi } from "vitest";
import {
  buildOutgoingDraft,
  toIsoDate,
  getFinalFieldValue,
  todayLocal,
} from "../helpers/outgoing-helpers";
import { FIELD_LABELS } from "../constans";
import type { ResultRow, FieldKey } from "../types/extraction-types";

/* ── toIsoDate ────────────────────────────────────────────────────────────── */

describe("toIsoDate", () => {
  it("passes a valid ISO date through", () => {
    expect(toIsoDate("2026-10-15")).toBe("2026-10-15");
  });

  it("trims surrounding whitespace", () => {
    expect(toIsoDate("  2026-10-15  ")).toBe("2026-10-15");
  });

  it("returns null for empty input", () => {
    expect(toIsoDate("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(toIsoDate("   ")).toBeNull();
  });

  it("returns null for a non-date string", () => {
    expect(toIsoDate("not a date")).toBeNull();
  });

  it("parses a written-out date ('October 15, 2026') into ISO", () => {
    expect(toIsoDate("October 15, 2026")).toBe("2026-10-15");
  });

  it("parses a slash-separated date ('2026/10/15') into ISO", () => {
    /*
     * Unlike isIsoDate (which is strict regex), toIsoDate delegates to the
     * Date constructor, so it accepts slash format and normalizes it.
     */
    expect(toIsoDate("2026/10/15")).toBe("2026-10-15");
  });

  it("rejects an impossible calendar date (2026-02-31) via getMonth check", () => {
    /*
     * new Date(2026, 1, 31) rolls to March 3. The regex match captures month=02,
     * but d.getMonth() === 2 (March, 0-indexed). Since 2 !== 02-1 (1), the
     * function returns null.
     */
    expect(toIsoDate("2026-02-31")).toBeNull();
  });

  it("rejects Feb 29 on a non-leap year", () => {
    expect(toIsoDate("2026-02-29")).toBeNull();
  });

  it("accepts Feb 29 on a leap year", () => {
    expect(toIsoDate("2024-02-29")).toBe("2024-02-29");
  });

  it("zero-pads single-digit months and days when parsed from a Date constructor", () => {
    /*
     * "Jan 5 2026" parses to a valid Date; the function formats it with
     * padStart to produce "2026-01-05".
     */
    expect(toIsoDate("Jan 5 2026")).toBe("2026-01-05");
  });

  it("returns the same ISO string it was given (idempotent)", () => {
    expect(toIsoDate(toIsoDate("2026-10-15")!)).toBe("2026-10-15");
  });

  it("rejects NaN garbage that the Date constructor might accept weirdly", () => {
    /*
     * "2026-13-45" — the regex matches the pattern but new Date returns NaN,
     * so the function returns null.
     */
    expect(toIsoDate("2026-13-45")).toBeNull();
  });
});

/* ── getFinalFieldValue ──────────────────────────────────────────────────── */

describe("getFinalFieldValue", () => {
  function makeRow(value: string | null, field: FieldKey = "subject"): ResultRow {
    return {
      field,
      value,
      page: 1,
      chunkIds: ["p1-o1"],
      highlights: [],
      aiConfidence: 90,
      sourceConfidence: 90,
      effectiveConfidence: 81,
    };
  }

  it("returns the edit value when the field key is present in edits", () => {
    const row = makeRow("extracted");
    const edits: Partial<Record<FieldKey, string>> = { subject: "edited" };
    expect(getFinalFieldValue(row, edits)).toBe("edited");
  });

  it("trims the edit value", () => {
    const row = makeRow("extracted");
    const edits: Partial<Record<FieldKey, string>> = { subject: "  edited  " };
    expect(getFinalFieldValue(row, edits)).toBe("edited");
  });

  it("falls back to the row value when no edit exists", () => {
    const row = makeRow("extracted value");
    expect(getFinalFieldValue(row, {})).toBe("extracted value");
  });

  it("trims the row value when falling back", () => {
    const row = makeRow("  extracted  ");
    expect(getFinalFieldValue(row, {})).toBe("extracted");
  });

  it("returns empty string when both edit and value are empty", () => {
    const row = makeRow("");
    const edits: Partial<Record<FieldKey, string>> = { subject: "" };
    expect(getFinalFieldValue(row, edits)).toBe("");
  });

  it("returns empty string when edit is empty but value is present (edit wins)", () => {
    /*
     * `row.field in edits` is true even when the value is "". So an empty
     * edit explicitly clears the field.
     */
    const row = makeRow("extracted");
    const edits: Partial<Record<FieldKey, string>> = { subject: "" };
    expect(getFinalFieldValue(row, edits)).toBe("");
  });

  it("handles null row value with no edit", () => {
    const row = makeRow(null);
    expect(getFinalFieldValue(row, {})).toBe("");
  });

  it("handles null row value with empty-edit (edit still wins)", () => {
    const row = makeRow(null);
    const edits: Partial<Record<FieldKey, string>> = { subject: "" };
    expect(getFinalFieldValue(row, edits)).toBe("");
  });
});

/* ── todayLocal ──────────────────────────────────────────────────────────── */

describe("todayLocal", () => {
  it("returns today's date in YYYY-MM-DD format in the local timezone", () => {
    /*
     * We pin the local Date constructor to a fixed value and verify the
     * output format and timezone-local behavior. Using vi.useFakeTimers
     * ensures the test is deterministic regardless of when it runs.
     * The date string uses no timezone offset so the result is the same
     * in every TZ (UTC midnight → 2026-10-15 everywhere).
     */
    const fixedDate = new Date("2026-10-15T12:00:00");
    vi.useFakeTimers({ now: fixedDate });

    const result = todayLocal();

    // Must be ISO format (4-digit year, 2-digit month, 2-digit day, dashes).
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Noon UTC is on the 15th in every timezone offset (< +12 and < -12 are
    // extremely rare for a system TZ), so 2026-10-15 is deterministic.
    expect(result).toBe("2026-10-15");

    vi.useRealTimers();
  });

  it("returns a valid calendar date (not an impossible one)", () => {
    const result = todayLocal();
    const [y, m, d] = result.split("-").map(Number);
    const reconstructed = new Date(y, m - 1, d);
    expect(reconstructed.getFullYear()).toBe(y);
    expect(reconstructed.getMonth()).toBe(m - 1);
    expect(reconstructed.getDate()).toBe(d);
  });
});

/* ── buildOutgoingDraft ──────────────────────────────────────────────────── */

describe("buildOutgoingDraft", () => {
  /** All four outgoing fields with valid values. */
  function makeRows(): ResultRow[] {
    return [
      row({ field: "to", value: "recipient@example.com" }),
      row({ field: "subject", value: "Contract Review" }),
      row({ field: "datePrepared", value: "2026-10-15" }),
      row({ field: "summary", value: "Please review the attached contract terms." }),
    ];
  }

  function row(overrides: Partial<ResultRow> = {}): ResultRow {
    return {
      field: "subject",
      value: "default",
      page: 1,
      chunkIds: ["p1-o1"],
      highlights: [],
      aiConfidence: 90,
      sourceConfidence: 90,
      effectiveConfidence: 81,
      ...overrides,
    };
  }

  /* ── Happy path ─────────────────────────────────────────────────────── */

  it("produces a valid draft with no issues when all fields are present and valid", () => {
    const draft = buildOutgoingDraft(makeRows(), {});
    expect(draft.to).toBe("recipient@example.com");
    expect(draft.subject).toBe("Contract Review");
    expect(draft.datePrepared).toBe("2026-10-15");
    expect(draft.summary).toBe("Please review the attached contract terms.");
    expect(draft.issues).toEqual([]);
  });

  /* ── Edit precedence ───────────────────────────────────────────────── */

  it("uses reviewer edits over extracted values", () => {
    const rows = makeRows();
    const edits: Partial<Record<FieldKey, string>> = {
      to: "edited@example.com",
      subject: "Edited Subject",
    };

    const draft = buildOutgoingDraft(rows, edits);
    expect(draft.to).toBe("edited@example.com");
    expect(draft.subject).toBe("Edited Subject");
    expect(draft.datePrepared).toBe("2026-10-15"); // untouched
    expect(draft.summary).toBe("Please review the attached contract terms."); // untouched
  });

  it("trims edit values", () => {
    const rows = makeRows();
    const edits: Partial<Record<FieldKey, string>> = { subject: "  padded  " };
    expect(buildOutgoingDraft(rows, edits).subject).toBe("padded");
  });

  /* ── datePrepared normalization ───────────────────────────────────── */

  it("normalizes a written-out datePrepared to ISO", () => {
    const rows = makeRows();
    const r = rows.find((r) => r.field === "datePrepared")!;
    r.value = "October 15, 2026";
    expect(buildOutgoingDraft(rows, {}).datePrepared).toBe("2026-10-15");
  });

  it("sets datePrepared to '' when the extracted value is an invalid date", () => {
    const rows = makeRows();
    const r = rows.find((r) => r.field === "datePrepared")!;
    r.value = "garbage";
    expect(buildOutgoingDraft(rows, {}).datePrepared).toBe("");
  });

  it("sets datePrepared to '' when the extracted value is an impossible date (Feb 31)", () => {
    const rows = makeRows();
    const r = rows.find((r) => r.field === "datePrepared")!;
    r.value = "2026-02-31";
    expect(buildOutgoingDraft(rows, {}).datePrepared).toBe("");
  });

  it("applies an editor override for datePrepared", () => {
    const rows = makeRows();
    const edits: Partial<Record<FieldKey, string>> = { datePrepared: "2026-01-01" };
    expect(buildOutgoingDraft(rows, edits).datePrepared).toBe("2026-01-01");
  });

  /* ── Issue detection ───────────────────────────────────────────────── */

  it("reports an issue for each missing required field", () => {
    const rows = makeRows();
    rows.forEach((r) => (r.value = ""));

    const draft = buildOutgoingDraft(rows, {});
    expect(draft.issues.sort()).toEqual(
      [
        `${FIELD_LABELS.to} is required`,
        `${FIELD_LABELS.subject} is required`,
        `${FIELD_LABELS.summary} is required`,
        `${FIELD_LABELS.datePrepared} is required`,
      ].sort(),
    );
  });

  it("reports a specific message for an invalid (non-empty) datePrepared", () => {
    const rows = makeRows();
    const r = rows.find((r) => r.field === "datePrepared")!;
    r.value = "03/04/2026"; // ambiguous but parseable by Date → becomes valid ISO? No, slash is accepted.

    const draft = buildOutgoingDraft(rows, {});
    // Slash-separated dates are accepted by toIsoDate, so this specific value
    // will normalize successfully. We need a truly invalid value:
    r.value = "not-a-date";
    const draft2 = buildOutgoingDraft(rows, {});
    expect(draft2.issues).toContain(
      `${FIELD_LABELS.datePrepared} isn't a valid date (use YYYY-MM-DD)`,
    );
    expect(draft2.datePrepared).toBe("");
  });

  it("does not report an issue for an empty datePrepared beyond 'is required'", () => {
    /*
     * When datePrepared is empty, draft.datePrepared is "", and the `need`
     * function fires "is required". The message arg is undefined (rawDate is
     * falsy), so it uses the default "is required" — NOT the "isn't a valid
     * date" message.
     */
    const rows = makeRows();
    const r = rows.find((r) => r.field === "datePrepared")!;
    r.value = "";

    const draft = buildOutgoingDraft(rows, {});
    expect(draft.datePrepared).toBe("");
    expect(draft.issues).toContain(`${FIELD_LABELS.datePrepared} is required`);
    expect(draft.issues).not.toContain(
      `${FIELD_LABELS.datePrepared} isn't a valid date (use YYYY-MM-DD)`,
    );
  });

  /* ── Length validation ──────────────────────────────────────────────── */

  it("flags `to` exceeding 255 characters", () => {
    const rows = makeRows();
    const r = rows.find((r) => r.field === "to")!;
    r.value = "a".repeat(256);

    const draft = buildOutgoingDraft(rows, {});
    expect(draft.issues).toContain(`${FIELD_LABELS.to} is over 255 characters`);
  });

  it("flags `subject` exceeding 500 characters", () => {
    const rows = makeRows();
    const r = rows.find((r) => r.field === "subject")!;
    r.value = "a".repeat(501);

    const draft = buildOutgoingDraft(rows, {});
    expect(draft.issues).toContain(
      `${FIELD_LABELS.subject} is over 500 characters`,
    );
  });

  it("flags `summary` exceeding 2000 characters", () => {
    const rows = makeRows();
    const r = rows.find((r) => r.field === "summary")!;
    r.value = "a".repeat(2001);

    const draft = buildOutgoingDraft(rows, {});
    expect(draft.issues).toContain(
      `${FIELD_LABELS.summary} is over 2000 characters`,
    );
  });

  it("does not flag fields exactly at their length limit", () => {
    const rows = makeRows();
    const toR = rows.find((r) => r.field === "to")!;
    toR.value = "a".repeat(255);

    const draft = buildOutgoingDraft(rows, {});
    expect(draft.issues).toEqual([]);
    expect(draft.issues).not.toContain(
      `${FIELD_LABELS.to} is over 255 characters`,
    );
  });

  /* ── Missing rows ──────────────────────────────────────────────────── */

  it("treats a missing row for a field as empty", () => {
    const rows = makeRows().filter((r) => r.field !== "subject");
    const draft = buildOutgoingDraft(rows, {});
    expect(draft.subject).toBe("");
    expect(draft.issues).toContain(`${FIELD_LABELS.subject} is required`);
  });

  it("treats a null row value as empty", () => {
    const rows = makeRows();
    const r = rows.find((r) => r.field === "summary")!;
    r.value = null;

    const draft = buildOutgoingDraft(rows, {});
    expect(draft.summary).toBe("");
    expect(draft.issues).toContain(`${FIELD_LABELS.summary} is required`);
  });
});
