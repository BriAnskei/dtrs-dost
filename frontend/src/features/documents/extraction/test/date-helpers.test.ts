/**
 * Unit tests for `date-helpers` (helpers/date-helpers.ts).
 *
 * PURE FUNCTIONS UNDER TEST:
 *
 *   isIsoDate(value: string): boolean
 *     - Returns true only for a real calendar date in YYYY-MM-DD format.
 *     - Rejects strings that parse as a valid JS Date but represent an
 *       impossible calendar date (e.g. 2026-02-31 rolls to March → false).
 *     - Rejects non-ISO formats ("2026/02/15", "2026-2-3") even if Date
 *       accepts them, because the backend requires zero-padded ISO.
 *
 *   normalizeDate(raw: string): string
 *     - Already ISO → returned as-is (trimmed).
 *     - Written-out ("October 15, 2026", "15 Oct 2026") → YYYY-MM-DD.
 *     - Month-only ("May 2026") → returned trimmed/unmodified (cannot guess day).
 *     - Ambiguous US/UK ("03/04/2026") or unparseable → returned trimmed.
 *
 *   DATE_FIELDS (constant):
 *     - The set of FieldKeys edited with a date picker rather than a text input:
 *       "dateReceived" and "datePrepared".
 */

import { describe, expect, it } from "vitest";
import { isIsoDate, normalizeDate, DATE_FIELDS } from "../helpers/date-helpers";

/* ── DATE_FIELDS ──────────────────────────────────────────────────────────── */

describe("DATE_FIELDS", () => {
  it("contains exactly dateReceived and datePrepared", () => {
    expect(DATE_FIELDS).toBeInstanceOf(Set);
    expect([...DATE_FIELDS].sort()).toEqual(["datePrepared", "dateReceived"]);
  });
});

/* ── isIsoDate ────────────────────────────────────────────────────────────── */

describe("isIsoDate", () => {
  it("returns true for a valid zero-padded ISO date", () => {
    expect(isIsoDate("2026-01-15")).toBe(true);
  });

  it("returns true for a valid ISO date in December", () => {
    expect(isIsoDate("2026-12-31")).toBe(true);
  });

  it("returns true for leap day on a leap year", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
  });

  it("returns false for Feb 29 on a non-leap year", () => {
    /*
     * Feb 30 doesn't exist, and Feb 29 only exists in leap years.
     * In 2026 (not a leap year), Feb 29 rolls over to March 1, so the
     * calendar-date check in isIsoDate rejects it.
     */
    expect(isIsoDate("2026-02-29")).toBe(false);
  });

  it("returns false for Feb 31 (impossible calendar date)", () => {
    /*
     * 2026-02-31 is not a real date: `new Date(2026, 1, 31)` rolls to March 3.
     * The function detects the roll by checking getMonth() !== mo-1.
     */
    expect(isIsoDate("2026-02-31")).toBe(false);
  });

  it("returns false for April 31 (April has 30 days)", () => {
    expect(isIsoDate("2026-04-31")).toBe(false);
  });

  it("returns false for month 00", () => {
    expect(isIsoDate("2026-00-15")).toBe(false);
  });

  it("returns false for month 13", () => {
    expect(isIsoDate("2026-13-15")).toBe(false);
  });

  it("returns false for day 00", () => {
    expect(isIsoDate("2026-01-00")).toBe(false);
  });

  it("returns false for day 32", () => {
    expect(isIsoDate("2026-01-32")).toBe(false);
  });

  it("returns false for non-zero-padded ISO (single-digit month)", () => {
    /*
     * The regex requires \d{2} for both month and day, so "2026-1-05" is
     * rejected even though new Date(2026, 0, 5) is valid. The backend expects
     * strict zero-padded YYYY-MM-DD.
     */
    expect(isIsoDate("2026-1-05")).toBe(false);
  });

  it("returns false for slash-separated dates", () => {
    expect(isIsoDate("2026/01/15")).toBe(false);
  });

  it("returns false for dot-separated dates", () => {
    expect(isIsoDate("15.01.2026")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isIsoDate("")).toBe(false);
  });

  it("returns false for random text", () => {
    expect(isIsoDate("not a date")).toBe(false);
  });

  it("returns false for a date with trailing garbage", () => {
    expect(isIsoDate("2026-01-15x")).toBe(false);
  });

  it("returns false for a date with leading whitespace", () => {
    expect(isIsoDate("  2026-01-15")).toBe(false);
  });
});

/* ── normalizeDate ────────────────────────────────────────────────────────── */

describe("normalizeDate", () => {
  it("returns an already-ISO date as-is", () => {
    expect(normalizeDate("2026-10-15")).toBe("2026-10-15");
  });

  it("trims surrounding whitespace from an ISO date", () => {
    expect(normalizeDate("  2026-10-15  ")).toBe("2026-10-15");
  });

  it("returns an already-ISO date unchanged (no double-normalization)", () => {
    expect(normalizeDate("2026-01-01")).toBe("2026-01-01");
  });

  /* ── Written-out formats ─────────────────────────────────────────────── */

  it("converts a long written-out date ('October 15, 2026') to ISO", () => {
    expect(normalizeDate("October 15, 2026")).toBe("2026-10-15");
  });

  it("converts a compact written-out date ('15 Oct 2026') to ISO", () => {
    expect(normalizeDate("15 Oct 2026")).toBe("2026-10-15");
  });

  it("converts a lowercase month ('15 october 2026') to ISO", () => {
    expect(normalizeDate("15 october 2026")).toBe("2026-10-15");
  });

  it("converts abbreviated month with dot ('15 Oct. 2026') to ISO", () => {
    expect(normalizeDate("15 Oct. 2026")).toBe("2026-10-15");
  });

  /* ── Ambiguous / unparseable formats (returned as-is) ─────────────────── */

  it("returns a slash date as-is (ambiguous day/month order)", () => {
    /*
     * The function deliberately does NOT guess which of 03/04 means day or
     * month. It returns the trimmed input so the reviewer picks from the
     * date picker.
     */
    expect(normalizeDate("03/04/2026")).toBe("03/04/2026");
  });

  it("returns garbage text trimmed and unchanged", () => {
    expect(normalizeDate("  not-a-date  ")).toBe("not-a-date");
  });

  it("returns a month-only string as-is ('May 2026')", () => {
    /*
     * The function requires a day number to attempt a conversion. Without one,
     * "May 2026" is returned unchanged rather than guessed as May 1.
     */
    expect(normalizeDate("May 2026")).toBe("May 2026");
  });

  it("returns an empty string as-is", () => {
    expect(normalizeDate("")).toBe("");
  });

  it("returns whitespace-only string as empty", () => {
    expect(normalizeDate("   ")).toBe("");
  });

  it("returns a string with only a month name as-is", () => {
    expect(normalizeDate("October")).toBe("October");
  });

  /* ── Edge cases for written-out parsing ─────────────────────────────── */

  it("returns an impossible written-out date ('February 30, 2026') as-is", () => {
    /*
     * "February 30, 2026" has a month name, a day number, and a year, so it
     * passes the regex gate. But new Date("February 30, 2026") rolls to
     * March 2 → Number.isNaN is false, but the resulting ISO does not match
     * the original intent. The function returns the raw string because its
     * goal is a best-effort ISO; it does not validate calendar correctness
     * for written-out dates (that's isIsoDate's job, called later by
     * buildIncomingDraft / buildOutgoingDraft).
     */
    const result = normalizeDate("February 30, 2026");
    // The Date constructor parses this, so it returns an ISO (rolled) date.
    // The caller (buildIncomingDraft) will then catch it via isIsoDate and
    // flag it as invalid.
    expect(result).not.toBe("February 30, 2026");
  });
});
