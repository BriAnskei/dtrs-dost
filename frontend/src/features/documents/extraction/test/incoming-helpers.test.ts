/**
 * Unit tests for `incoming-helpers` (helpers/incoming-helpers.ts).
 *
 * PURE FUNCTION UNDER TEST:
 *
 *   buildIncomingDraft(
 *     rows: ResultRow[],
 *     edits: Partial<Record<FieldKey, string>>,
 *   ): IncomingDraft
 *
 * Joins the LLM-extracted rows with reviewer edits to produce the final
 * values sent to the backend. Rules:
 *
 *   - Edits always win over extracted values; a missing edit falls back to
 *     the row's `value` (trimmed).
 *   - `dateReceived` is normalized via `normalizeDate` so written-out dates
 *     become ISO, but an already-ISO date is untouched.
 *   - An `issues` array is populated for every missing/empty required field
 *     and for a `dateReceived` that doesn't pass `isIsoDate`.
 *
 * The `KEYS` interface maps field keys to the column name used in the
 * IncomingDraft result: documentFrom → "from", recipient → "to", etc.
 */

import { describe, expect, it } from "vitest";
import { buildIncomingDraft } from "../helpers/incoming-helpers";
import { FIELD_LABELS } from "../constans";
import type { ResultRow, FieldKey } from "../types/extraction-types";

/* ── Test helpers ────────────────────────────────────────────────────────── */

/** A fully-populated ResultRow with sensible defaults for testing. */
function row(overrides: Partial<ResultRow> = {}): ResultRow {
  return {
    field: "subject",
    value: "test-value",
    page: 1,
    chunkIds: ["p1-o1"],
    highlights: [],
    aiConfidence: 90,
    sourceConfidence: 90,
    effectiveConfidence: 81,
    ...overrides,
  };
}

/** All five incoming fields as complete rows. */
function makeRows(): ResultRow[] {
  return [
    row({ field: "subject", value: "Meeting Notes" }),
    row({ field: "from", value: "sender@example.com" }),
    row({ field: "to", value: "recipient@example.com" }),
    row({ field: "dateReceived", value: "2026-10-15" }),
    row({ field: "summary", value: "Discussion of Q4 budget" }),
  ];
}

/* ── buildIncomingDraft ──────────────────────────────────────────────────── */

describe("buildIncomingDraft", () => {
  /* ── Edit-wins behavior ─────────────────────────────────────────────── */

  describe("edit precedence", () => {
    it("uses reviewer edits over extracted values", () => {
      const rows = makeRows();
      const edits: Partial<Record<FieldKey, string>> = {
        subject: "Edited subject",
        from: "edited@example.com",
      };

      const draft = buildIncomingDraft(rows, edits);

      expect(draft.subject).toBe("Edited subject");
      expect(draft.documentFrom).toBe("edited@example.com");
      // Non-edited fields still come from the rows.
      expect(draft.recipient).toBe("recipient@example.com");
    });

    it("trims whitespace from edit values", () => {
      const rows = makeRows();
      const edits: Partial<Record<FieldKey, string>> = {
        subject: "  padded subject  ",
      };

      expect(buildIncomingDraft(rows, edits).subject).toBe("padded subject");
    });

    it("trims whitespace from extracted values", () => {
      const rows = makeRows();
      const r = rows.find((r) => r.field === "subject")!;
      r.value = "  extracted with spaces  ";

      expect(buildIncomingDraft(rows, {}).subject).toBe("extracted with spaces");
    });

    it("uses empty string for edit value that is present but empty", () => {
      /*
       * An edit of "" means the reviewer explicitly cleared the field. The
       * function treats `field in edits` as "the reviewer touched this," so
       * "" wins over the extracted value and becomes an issue.
       */
      const rows = makeRows();
      const edits: Partial<Record<FieldKey, string>> = { subject: "" };

      const draft = buildIncomingDraft(rows, edits);
      expect(draft.subject).toBe("");
      expect(draft.issues).toContain(`${FIELD_LABELS.subject} is empty`);
    });
  });

  /* ── Date normalization ──────────────────────────────────────────────── */

  describe("dateReceived normalization", () => {
    it("passes an already-ISO date through unchanged", () => {
      const rows = makeRows();
      const draft = buildIncomingDraft(rows, {});
      expect(draft.dateReceived).toBe("2026-10-15");
      expect(draft.issues).toEqual([]);
    });

    it("converts a written-out date to ISO", () => {
      const rows = makeRows();
      const r = rows.find((r) => r.field === "dateReceived")!;
      r.value = "October 15, 2026";

      const draft = buildIncomingDraft(rows, {});
      expect(draft.dateReceived).toBe("2026-10-15");
      expect(draft.issues).toEqual([]);
    });

    it("flags an ambiguous date (03/04/2026) as invalid", () => {
      /*
       * normalizeDate returns "03/04/2026" unchanged (ambiguous). isIsoDate
       * then rejects it → the draft has a "not a valid date" issue.
       */
      const rows = makeRows();
      const r = rows.find((r) => r.field === "dateReceived")!;
      r.value = "03/04/2026";

      const draft = buildIncomingDraft(rows, {});
      expect(draft.dateReceived).toBe("03/04/2026");
      expect(draft.issues).toContain(
        `${FIELD_LABELS.dateReceived} isn't a valid date, pick it with the pencil`,
      );
    });

    it("allows an editor override of dateReceived", () => {
      const rows = makeRows();
      const edits: Partial<Record<FieldKey, string>> = { dateReceived: "2026-01-01" };

      expect(buildIncomingDraft(rows, edits).dateReceived).toBe("2026-01-01");
    });

    it("flags an empty date as invalid even after normalization", () => {
      const rows = makeRows();
      const r = rows.find((r) => r.field === "dateReceived")!;
      r.value = "";

      const draft = buildIncomingDraft(rows, {});
      expect(draft.dateReceived).toBe("");
      // Two issues: empty (caught by required loop) + not a valid date.
      expect(draft.issues).toContain(`${FIELD_LABELS.dateReceived} is empty`);
      // The not-a-valid-date issue only fires when dateReceived is non-empty
      // but fails isIsoDate. Since it's empty, only the "is empty" issue fires.
      expect(draft.issues).not.toContain(
        `${FIELD_LABELS.dateReceived} isn't a valid date, pick it with the pencil`,
      );
    });
  });

  /* ── Issue detection ───────────────────────────────────────────────── */

  describe("issues array", () => {
    it("returns no issues when all fields are present and valid", () => {
      const draft = buildIncomingDraft(makeRows(), {});
      expect(draft.issues).toEqual([]);
      expect(draft.dateReceived).toBe("2026-10-15");
    });

    it("reports an issue for each missing required field", () => {
      const rows = makeRows();
      // Blank out all values.
      rows.forEach((r) => (r.value = ""));

      const draft = buildIncomingDraft(rows, {});
      expect(draft.issues.sort()).toEqual(
        [
          `${FIELD_LABELS.subject} is empty`,
          `${FIELD_LABELS.from} is empty`,
          `${FIELD_LABELS.to} is empty`,
          `${FIELD_LABELS.dateReceived} is empty`,
          `${FIELD_LABELS.summary} is empty`,
        ].sort(),
      );
    });

    it("does not duplicate an issue for a field that is both empty and an invalid date", () => {
      /*
       * When dateReceived is "", the required-check fires "is empty". The
       * invalid-date check is guarded by `draft.dateReceived &&` so it does
       * NOT fire on an empty value (avoids a redundant double message).
       */
      const rows = makeRows();
      const r = rows.find((r) => r.field === "dateReceived")!;
      r.value = "";

      const draft = buildIncomingDraft(rows, {});
      const emptyIssues = draft.issues.filter((i) =>
        i.includes(FIELD_LABELS.dateReceived),
      );
      expect(emptyIssues).toHaveLength(1);
      expect(emptyIssues[0]).toBe(`${FIELD_LABELS.dateReceived} is empty`);
    });

    it("reports an issue only for invalid date when value is present but malformed", () => {
      const rows = makeRows();
      const r = rows.find((r) => r.field === "dateReceived")!;
      r.value = "garbage";

      const draft = buildIncomingDraft(rows, {});
      expect(draft.dateReceived).toBe("garbage");
      expect(draft.issues).toContain(
        `${FIELD_LABELS.dateReceived} isn't a valid date, pick it with the pencil`,
      );
    });
  });

  /* ── Field mapping ─────────────────────────────────────────────────── */

  describe("field mapping", () => {
    it("maps 'from' to documentFrom", () => {
      const rows = makeRows();
      const draft = buildIncomingDraft(rows, {});
      expect(draft.documentFrom).toBe("sender@example.com");
    });

    it("maps 'to' to recipient", () => {
      const rows = makeRows();
      const draft = buildIncomingDraft(rows, {});
      expect(draft.recipient).toBe("recipient@example.com");
    });

    it("maps all five fields correctly", () => {
      const draft = buildIncomingDraft(makeRows(), {});
      expect(draft.documentFrom).toBe("sender@example.com");
      expect(draft.recipient).toBe("recipient@example.com");
      expect(draft.subject).toBe("Meeting Notes");
      expect(draft.dateReceived).toBe("2026-10-15");
      expect(draft.summary).toBe("Discussion of Q4 budget");
    });
  });

  /* ── Missing rows ──────────────────────────────────────────────────── */

  describe("missing rows", () => {
    it("treats a row with value=null as empty", () => {
      const rows = makeRows();
      const r = rows.find((r) => r.field === "subject")!;
      r.value = null;

      const draft = buildIncomingDraft(rows, {});
      expect(draft.subject).toBe("");
      expect(draft.issues).toContain(`${FIELD_LABELS.subject} is empty`);
    });

    it("produces empty string for a field with no matching row", () => {
      /*
       * If the LLM didn't return a row for this field at all, fieldValue
       * falls back to "" (find returns undefined → value ?? "").
       */
      const rows = makeRows().filter((r) => r.field !== "summary");
      const draft = buildIncomingDraft(rows, {});
      expect(draft.summary).toBe("");
      expect(draft.issues).toContain(`${FIELD_LABELS.summary} is empty`);
    });
  });
});
