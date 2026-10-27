/**
 * Unit tests for `WizardStepper` — the horizontal progress stepper.
 *
 * THE COMPONENT (components/WizardStepper.tsx):
 *
 *   Props:
 *     - steps: readonly { label: string }[]
 *     - current: number  (0-based index of the active step)
 *     - canNavigate: (index) => boolean  — whether a step's button is clickable
 *     - onStepClick: (index) => void
 *     - status?: Partial<Record<number, "warning" | "error">>  — per-step icon state
 *
 * Rendering rules:
 *   - Done (index < current): green circle + check icon
 *   - Active (index === current): secondary circle + number
 *   - Inactive (index > current): gray circle + number
 *   - status === "error": red circle (overrides done/active/inactive)
 *   - status === "warning": amber circle (overrides done/active/inactive)
 *   - Only done steps are clickable (canNavigate gates this)
 *   - aria-current="step" on the active button
 *   - aria-label includes "Step N: Label (completed)" for done steps
 *   - Progress line between steps: colored when done, gray when not
 *   - Mobile caption: "Step {current+1} of {length} · {label}"
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WizardStepper from "../admins/components/WizardStepper";

const STEPS = [
  { label: "Type" },
  { label: "Upload" },
  { label: "Extraction" },
  { label: "Review" },
];

describe("WizardStepper", () => {
  /* ── Step buttons ───────────────────────────────────────────────── */

  describe("step buttons", () => {
    it("renders a button for each step", () => {
      render(
        <WizardStepper
          steps={STEPS}
          current={0}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(4);
    });

    it("labels each button with 'Step N: Label'", () => {
      render(
        <WizardStepper
          steps={STEPS}
          current={0}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      expect(screen.getByLabelText("Step 1: Type")).toBeInTheDocument();
      expect(screen.getByLabelText("Step 2: Upload")).toBeInTheDocument();
      expect(screen.getByLabelText("Step 3: Extraction")).toBeInTheDocument();
      expect(screen.getByLabelText("Step 4: Review")).toBeInTheDocument();
    });

    it("marks the current step with aria-current='step'", () => {
      render(
        <WizardStepper
          steps={STEPS}
          current={2}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons[2]).toHaveAttribute("aria-current", "step");
      expect(buttons[0]).not.toHaveAttribute("aria-current");
    });
  });

  /* ── Completed / active / inactive states ────────────────────────── */

  describe("step states", () => {
    it("shows '(completed)' in the aria-label for done steps", () => {
      render(
        <WizardStepper
          steps={STEPS}
          current={2}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      expect(screen.getByLabelText("Step 1: Type (completed)")).toBeInTheDocument();
      expect(screen.getByLabelText("Step 2: Upload (completed)")).toBeInTheDocument();
      expect(screen.getByLabelText("Step 3: Extraction")).toBeInTheDocument();
    });

    it("shows a check icon for completed steps (via the Check SVG path)", () => {
      const { container } = render(
        <WizardStepper
          steps={STEPS}
          current={2}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      // Completed step circle contains the Check SVG path "M5 13l4 4L19 7".
      const checkPaths = container.querySelectorAll('path[d="M5 13l4 4L19 7"]');
      expect(checkPaths.length).toBeGreaterThanOrEqual(1);
    });

    it("shows step number for the active step", () => {
      render(
        <WizardStepper
          steps={STEPS}
          current={1}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      const buttons = screen.getAllByRole("button");
      // Active step (index 1) has its number in the circle text.
      const circle = buttons[1].querySelector("span");
      expect(circle?.textContent).toBe("2");
    });

    it("shows step number for inactive (not-done) steps", () => {
      render(
        <WizardStepper
          steps={STEPS}
          current={0}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      const buttons = screen.getAllByRole("button");
      // Steps 2, 3, 4 are inactive → show their numbers.
      expect(buttons[1].querySelector("span")?.textContent).toBe("2");
      expect(buttons[2].querySelector("span")?.textContent).toBe("3");
      expect(buttons[3].querySelector("span")?.textContent).toBe("4");
    });
  });

  /* ── Status icons (warning / error) ───────────────────────────────── */

  describe("status icons", () => {
    it("renders an Alert icon for steps with status 'error'", () => {
      const { container } = render(
        <WizardStepper
          steps={STEPS}
          current={3}
          status={{ 3: "error" }}
          canNavigate={() => true}
          onStepClick={() => {}}
        />,
      );

      // Alert SVG path is "M12 8v5m0 4h.01".
      const alertPaths = container.querySelectorAll('path[d="M12 8v5m0 4h.01"]');
      expect(alertPaths.length).toBeGreaterThanOrEqual(1);
    });

    it("renders an Alert icon for steps with status 'warning'", () => {
      const { container } = render(
        <WizardStepper
          steps={STEPS}
          current={3}
          status={{ 3: "warning" }}
          canNavigate={() => true}
          onStepClick={() => {}}
        />,
      );

      const alertPaths = container.querySelectorAll('path[d="M12 8v5m0 4h.01"]');
      expect(alertPaths.length).toBeGreaterThanOrEqual(1);
    });

    it("does NOT render an Alert icon when status is undefined for a step", () => {
      const { container } = render(
        <WizardStepper
          steps={STEPS}
          current={0}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      const alertPaths = container.querySelectorAll('path[d="M12 8v5m0 4h.01"]');
      expect(alertPaths).toHaveLength(0);
    });
  });

  /* ── Click handling ──────────────────────────────────────────────── */

  describe("click handling", () => {
    it("calls onStepClick with the step index when clicked", () => {
      const onStepClick = vi.fn();
      render(
        <WizardStepper
          steps={STEPS}
          current={2}
          canNavigate={(i) => i < 2}
          onStepClick={onStepClick}
        />,
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      expect(onStepClick).toHaveBeenCalledWith(0);
    });

    it("does NOT call onStepClick for non-navigable steps (disabled button)", () => {
      const onStepClick = vi.fn();
      render(
        <WizardStepper
          steps={STEPS}
          current={2}
          canNavigate={() => false}
          onStepClick={onStepClick}
        />,
      );

      const buttons = screen.getAllByRole("button");
      // All buttons should be disabled.
      buttons.forEach((btn) => expect(btn).toBeDisabled());
      fireEvent.click(buttons[0]);

      expect(onStepClick).not.toHaveBeenCalled();
    });

    it("clicks on step 2 are enabled when canNavigate returns true for that index", () => {
      const onStepClick = vi.fn();
      render(
        <WizardStepper
          steps={STEPS}
          current={2}
          canNavigate={(i) => i === 1}
          onStepClick={onStepClick}
        />,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons[1]).toBeEnabled();
      expect(buttons[0]).toBeDisabled();

      fireEvent.click(buttons[1]);
      expect(onStepClick).toHaveBeenCalledWith(1);
    });
  });

  /* ── Progress line between steps ─────────────────────────────────── */

  describe("progress lines", () => {
    it("renders a separator between steps when there is more than one step", () => {
      const { container } = render(
        <WizardStepper
          steps={STEPS}
          current={1}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      // 4 steps → 3 separators (all are 'span[aria-hidden="true"]').
      const separators = container.querySelectorAll('span[aria-hidden="true"]');
      expect(separators).toHaveLength(3);
    });

    it("coloring: separator is colored after done steps, gray otherwise", () => {
      const { container } = render(
        <WizardStepper
          steps={STEPS}
          current={2}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      const separators = container.querySelectorAll('span[aria-hidden="true"]');
      // After step 0 (done) → colored with 'bg-primary'.
      // After step 1 (done) → colored with 'bg-primary'.
      // After step 2 (active, not done) → gray 'bg-gray-200'.
      expect(separators[0].className).toContain("bg-primary");
      expect(separators[1].className).toContain("bg-primary");
      expect(separators[2].className).toContain("bg-gray-200");
    });
  });

  /* ── Mobile caption ──────────────────────────────────────────────── */

  describe("mobile caption", () => {
    it("renders a 'Step N of M' caption in the hidden sm:block span", () => {
      render(
        <WizardStepper
          steps={STEPS}
          current={1}
          canNavigate={() => false}
          onStepClick={() => {}}
        />,
      );

      expect(screen.getByText("Step 2 of 4 · Upload")).toBeInTheDocument();
    });
  });
});
