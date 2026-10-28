/**
 * Unit tests for `DecisionBadge` — the small colored badge that renders the
 * extraction decision inside the queue table.
 *
 * THE COMPONENT (queue-list/components/DicisionBadge.tsx):
 *
 *   Renders <StatusBadge config={DECISION_BADGE[decision]} />.
 *
 *   Decision → Badge color/label:
 *     ACCEPT  → success / "Accepted"
 *     REVIEW  → warning  / "For Review"
 *     INVALID → error    / "Invalid"
 *
 * `DECISION_LABELS` (exported from the same file) maps:
 *   ACCEPT → DECISION_BADGE.ACCEPT.label ("Accepted")
 *   REVIEW → DECISION_BADGE.REVIEW.label ("For Review")
 *   INVALID → DECISION_BADGE.INVALID.label ("Invalid")
 *
 * Tests pin: the label text per decision and the label export.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DecisionBadge, { DECISION_LABELS } from "../queue-list/components/DicisionBadge";
import { DECISION_BADGE } from "../../../../components/ui/badge/StatusBadge";
import type { Decision } from "../../extraction/types/extraction-types";

describe("DecisionBadge", () => {
  describe("label rendering", () => {
    it("renders 'Accepted' for ACCEPT decision", () => {
      render(<DecisionBadge decision="ACCEPT" />);

      expect(screen.getByText("Accepted")).toBeInTheDocument();
    });

    it("renders 'For Review' for REVIEW decision", () => {
      render(<DecisionBadge decision="REVIEW" />);

      expect(screen.getByText("For Review")).toBeInTheDocument();
    });

    it("renders 'Invalid' for INVALID decision", () => {
      render(<DecisionBadge decision="INVALID" />);

      expect(screen.getByText("Invalid")).toBeInTheDocument();
    });
  });

  describe("DECISION_LABELS export", () => {
    /*
     * DECISION_LABELS is imported by FilterPopover and ActiveFilterChips to
     * show human-readable decision names in filter chips. It must match
     * DECISION_BADGE labels exactly so the filter chips and the table agree.
     */
    const cases: [Decision, string][] = [
      ["ACCEPT", "Accepted"],
      ["REVIEW", "For Review"],
      ["INVALID", "Invalid"],
    ];

    for (const [decision, expected] of cases) {
      it(`DECISION_LABELS.${decision} equals DECISION_BADGE label`, () => {
        expect(DECISION_LABELS[decision]).toBe(DECISION_BADGE[decision].label);
        expect(DECISION_LABELS[decision]).toBe(expected);
      });
    }
  });
});
