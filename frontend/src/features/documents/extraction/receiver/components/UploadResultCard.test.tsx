/**
 * Unit tests for `UploadResultCard` — a presentational component that renders
 * the extraction result (decision + per-field confidence bars) after a
 * successful receiver upload.
 *
 * THE COMPONENT (components/UploadResultCard.tsx):
 *
 *   UploadResultCard({ fileName, result })
 *
 *   result: ReceiverUploadResponse = {
 *     decision: "ACCEPT" | "REVIEW" | "INVALID",
 *     fields: ReceiverExtractedField[] = {
 *       field: "subject" | "from" | "to" | "dateReceived" | "summary",
 *       value: string | null,
 *       chunkIds: string[],
 *       aiConfidence: number | null,
 *       sourceConfidence: number | null,
 *       effectiveConfidence: number | null,
 *     }[]
 *   }
 *
 * The component uses:
 *   - `toPercent`, `isLowConfidence`, `formatPercent` from helpers/reciever-upload-confidence
 *   - `CONFIDENCE_THRESHOLDS` and `FIELD_LABELS` from receiver-upload-constants
 *   - `Decision` type from ../../types/extraction-types
 *
 * DECISION_STYLES maps each Decision to { label, message, text: TailwindClasses }.
 *
 * WHAT WE TEST:
 *   - Decision label + message renders per ACCEPT / REVIEW / INVALID.
 *   - Decision label color class is applied correctly.
 *   - Each field renders with its FIELD_LABEL, value, "Not found" placeholder.
 *   - Effective confidence bar width + low-confidence (red) styling.
 *   - Source % and AI % render in the sub-text line.
 *   - formatPercent renders null as "—".
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UploadResultCard from "./UploadResultCard";
import type { ReceiverUploadResponse } from "../types/reciever-upload-api-types";
import type { Decision } from "../../types/extraction-types";

/*
 * Build a complete ReceiverUploadResponse with all five incoming fields.
 * Each field can be overridden; defaults produce a mixed confidence set so
 * we can verify both "low" (red) and "normal" bar styling in one render.
 */
function makeResponse(overrides: {
  decision?: Decision;
  fields?: Partial<ReceiverUploadResponse["fields"][number]>[];
} = {}): ReceiverUploadResponse {
  const baseFields = [
    { field: "subject" as const, value: "Foo", chunkIds: ["c1"], aiConfidence: 90, sourceConfidence: 95, effectiveConfidence: 86 },
    { field: "from" as const, value: "Bar", chunkIds: ["c1"], aiConfidence: 60, sourceConfidence: 70, effectiveConfidence: 42 },
    { field: "to" as const, value: null, chunkIds: [], aiConfidence: null, sourceConfidence: null, effectiveConfidence: null },
    { field: "dateReceived" as const, value: "10/03/2026", chunkIds: ["c1"], aiConfidence: 95, sourceConfidence: 92, effectiveConfidence: 87 },
    { field: "summary" as const, value: "A summary text", chunkIds: ["c1"], aiConfidence: 85, sourceConfidence: 88, effectiveConfidence: 75 },
  ];

  return {
    decision: overrides.decision ?? "REVIEW",
    fields: overrides.fields
      ? overrides.fields.map((f, i) => ({ ...baseFields[i], ...f }))
      : baseFields,
  };
}

describe("UploadResultCard", () => {
  describe("decision rendering", () => {
    it("renders ACCEPT decision with the correct label and message", () => {
      render(
        <UploadResultCard fileName="doc.pdf" result={makeResponse({ decision: "ACCEPT" })} />,
      );

      expect(screen.getByText("Accepted")).toBeInTheDocument();
      // The message is rendered inside a <p> that also contains "Sent to an admin for validation." prefix.
      expect(
        screen.getByText(/The details were extracted successfully\./),
      ).toBeInTheDocument();
    });

    it("renders REVIEW decision with the correct label and message", () => {
      render(
        <UploadResultCard fileName="doc.pdf" result={makeResponse({ decision: "REVIEW" })} />,
      );

      expect(screen.getByText("Needs review")).toBeInTheDocument();
      expect(
        screen.getByText(/Some details have low confidence\./),
      ).toBeInTheDocument();
    });

    it("renders INVALID decision with the correct label and message", () => {
      render(
        <UploadResultCard fileName="doc.pdf" result={makeResponse({ decision: "INVALID" })} />,
      );

      expect(screen.getByText("Invalid")).toBeInTheDocument();
      expect(
        screen.getByText(/The document could not be reliably read\./),
      ).toBeInTheDocument();
    });

    it("applies the decision-specific text color class", () => {
      const { container } = render(
        <UploadResultCard fileName="doc.pdf" result={makeResponse({ decision: "REVIEW" })} />,
      );

      // REVIEW uses warning text color.
      const decisionSpan = container.querySelector("span.shrink-0");
      expect(decisionSpan).toHaveClass("text-warning-700");
    });

    it("uses neutral text color for ACCEPT (no color emphasis)", () => {
      const { container } = render(
        <UploadResultCard fileName="doc.pdf" result={makeResponse({ decision: "ACCEPT" })} />,
      );

      const decisionSpan = container.querySelector("span.shrink-0");
      expect(decisionSpan).toHaveClass("text-gray-700");
      expect(decisionSpan).not.toHaveClass("text-warning-700");
    });
  });

  describe("file name rendering", () => {
    it("displays the fileName in the header", () => {
      render(
        <UploadResultCard fileName="my-document.pdf" result={makeResponse()} />,
      );

      expect(screen.getByText("my-document.pdf")).toBeInTheDocument();
    });
  });

  describe("field rendering", () => {
    it("renders the field label for each field", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      // FIELD_LABELS maps field keys to display names.
      expect(screen.getByText("Subject")).toBeInTheDocument();
      expect(screen.getByText("From")).toBeInTheDocument();
      expect(screen.getByText("To")).toBeInTheDocument();
      expect(screen.getByText("Date received")).toBeInTheDocument();
      expect(screen.getByText("Summary")).toBeInTheDocument();
    });

    it("renders non-null field values as text", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      expect(screen.getByText("Foo")).toBeInTheDocument();
      expect(screen.getByText("Bar")).toBeInTheDocument();
      expect(screen.getByText("10/03/2026")).toBeInTheDocument();
      expect(screen.getByText("A summary text")).toBeInTheDocument();
    });

    it("renders 'Not found' for null field values", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      // The "to" field is set to null in our default response.
      const notFoundEls = screen.getAllByText("Not found");
      expect(notFoundEls.length).toBeGreaterThanOrEqual(1);
    });

    it("renders effective confidence percentage for each field", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      // effectiveConfidence 86 → "86%", 42 → "42%", null → "—", 87 → "87%", 75 → "75%"
      expect(screen.getByText("86%")).toBeInTheDocument();
      expect(screen.getByText("42%")).toBeInTheDocument();
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("87%")).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("renders source and AI confidence in the sub-text line as 'Source X% · AI Y%'", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      // For the "subject" field: source=95, ai=90
      expect(screen.getByText("Source 95% · AI 90%")).toBeInTheDocument();
    });
  });

  describe("confidence bar styling", () => {
    it("applies red bar (bg-error-500) for low effective confidence (< 70%)", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      // The "from" field has effectiveConfidence=42 → low → error bar.
      const bars = screen.getAllByRole("progressbar");
      // Find the bar with aria-valuenow=42.
      const lowBar = Array.from(bars).find((b) => b.getAttribute("aria-valuenow") === "42");
      expect(lowBar).toBeDefined();

      const barFill = lowBar!.querySelector("div");
      expect(barFill).toHaveClass("bg-error-500");
    });

    it("applies gray bar (bg-gray-400) for normal effective confidence (>= 70%)", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      // The "subject" field has effectiveConfidence=86 → normal → gray bar.
      const bars = screen.getAllByRole("progressbar");
      const normalBar = Array.from(bars).find(
        (b) => b.getAttribute("aria-valuenow") === "86",
      );
      expect(normalBar).toBeDefined();

      const barFill = normalBar!.querySelector("div");
      expect(barFill).toHaveClass("bg-gray-400");
    });

    it("sets bar width based on effective confidence percentage", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      const bars = screen.getAllByRole("progressbar");
      const subjectBar = Array.from(bars).find(
        (b) => b.getAttribute("aria-valuenow") === "86",
      );
      const barFill = subjectBar!.querySelector("div")!;
      expect(barFill).toHaveStyle({ width: "86%" });
    });

    it("renders — for null effective confidence with 0% width", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      const bars = screen.getAllByRole("progressbar");
      // When effectiveConfidence is null, aria-valuenow is omitted (getAttribute returns null).
      const nullBar = Array.from(bars).find(
        (b) => b.getAttribute("aria-valuenow") === null,
      );
      expect(nullBar).toBeDefined();

      // aria-valuetext = "Not available" for null confidence.
      expect(nullBar).toHaveAttribute("aria-valuetext", "Not available");

      const barFill = nullBar!.querySelector("div")!;
      expect(barFill).toHaveStyle({ width: "0%" });
    });
  });

  describe("confidence thresholds note", () => {
    it("renders the threshold note explaining the review process", () => {
      render(<UploadResultCard fileName="doc.pdf" result={makeResponse()} />);

      expect(screen.getByText(/Values below 70% are shown in red/)).toBeInTheDocument();
      expect(screen.getByText(/An admin will verify the details/)).toBeInTheDocument();
    });
  });
});
