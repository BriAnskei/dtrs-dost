/**
 * Unit tests for `DecisionBanner` — the colored status banner shown in the
 * review step.
 *
 * THE COMPONENT (components/DecisionBanner.tsx):
 *
 *   Renders a colored box based on `decision`:
 *     ACCEPT  → green  / "ACCEPTED"
 *     REVIEW  → amber  / "HUMAN REVIEW REQUIRED"
 *     INVALID → red    / "INVALID"
 *
 * Props:
 *   - decision: "ACCEPT" | "REVIEW" | "INVALID"
 *   - minEffective: number | null  (shown as "N%" or "—")
 *
 * Tests pin: the title text per decision, the minEffective display, the
 * "—" fallback for null, and the descriptive text per decision.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DecisionBanner from "../admins/components/DecisionBanner";
import { ACCEPT_THRESHOLD } from "../constans";

describe("DecisionBanner", () => {
  it("renders ACCEPTED title for ACCEPT decision", () => {
    render(<DecisionBanner decision="ACCEPT" minEffective={95} />);

    expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
  });

  it("renders HUMAN REVIEW title for REVIEW decision", () => {
    render(<DecisionBanner decision="REVIEW" minEffective={85} />);

    expect(screen.getByText("HUMAN REVIEW REQUIRED")).toBeInTheDocument();
  });

  it("renders INVALID title for INVALID decision", () => {
    render(<DecisionBanner decision="INVALID" minEffective={null} />);

    expect(screen.getByText("INVALID")).toBeInTheDocument();
  });

  it("displays minEffective as percentage when not null", () => {
    render(<DecisionBanner decision="ACCEPT" minEffective={92} />);

    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("displays '—' when minEffective is null", () => {
    render(<DecisionBanner decision="INVALID" minEffective={null} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the ACCEPT_THRESHOLD in the threshold line", () => {
    render(<DecisionBanner decision="ACCEPT" minEffective={95} />);

    // The threshold text is split across multiple text nodes inside the <p>,
    // so use a function matcher to find the element containing the substring.
    expect(
      screen.getByText((content) =>
        content.includes(`≥ ${ACCEPT_THRESHOLD}%`),
      ),
    ).toBeInTheDocument();
  });

  it("renders the descriptive text for each decision", () => {
    const descriptions = {
      ACCEPT: "All fields present and confidence meets the threshold.",
      REVIEW: "At least one field is below the threshold and needs validation.",
      INVALID: "One or more fields are missing or could not be verified.",
    };

    for (const [decision, desc] of Object.entries(descriptions)) {
      const { unmount } = render(
        <DecisionBanner
          decision={decision as "ACCEPT" | "REVIEW" | "INVALID"}
          minEffective={90}
        />,
      );

      expect(screen.getByText(desc)).toBeInTheDocument();
      unmount();
    }
  });
});
