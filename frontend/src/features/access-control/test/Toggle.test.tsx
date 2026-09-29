/**
 * Unit tests for the `Toggle` component used in the access-control UI.
 *
 * Toggle renders a `<button role="switch">` that flips a boolean permission
 * flag. It is consumed by `AdminAccessRow` for every permission row, and
 * receives a `disabled` prop that combines two sources:
 *
 *   - `locked` — the permission is gated behind a dependency (e.g. master
 *     access is off, or a parent permission is off).
 *   - `isSaving` — this specific admin's save request is in flight.
 *
 * When `disabled` is true the button must NOT fire `onChange`, so the click
 * is a no-op and no state mutation occurs.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Toggle from "../components/Toggle";

describe("Toggle", () => {
  it("renders as a switch with the correct aria-checked state", () => {
    const onChange = vi.fn();

    const { rerender } = render(<Toggle enabled={true} onChange={onChange} />);
    let sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "true");

    rerender(<Toggle enabled={false} onChange={onChange} />);
    sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("fires onChange with the opposite value when clicked", () => {
    const onChange = vi.fn();

    const { rerender } = render(<Toggle enabled={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(<Toggle enabled={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("does NOT fire onChange when disabled (saving state)", () => {
    /*
     * AdminAccessRow passes `disabled={locked || isSaving}`. While saving,
     * every toggle in the row is disabled — clicks are no-ops so no draft
     * mutation happens mid-request.
     */
    const onChange = vi.fn();

    render(<Toggle enabled={false} onChange={onChange} disabled={true} />);
    const sw = screen.getByRole("switch");

    expect(sw).toBeDisabled();
    fireEvent.click(sw);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does NOT fire onChange when disabled (locked state)", () => {
    /*
     * When a permission is locked (e.g. master access off), toggling must
     * not fire — the lock is enforced by the parent, not the Toggle itself.
     */
    const onChange = vi.fn();

    render(<Toggle enabled={true} onChange={onChange} disabled={true} />);
    fireEvent.click(screen.getByRole("switch"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies disabled visual style (opacity + cursor)", () => {
    render(<Toggle enabled={false} onChange={vi.fn()} disabled={true} />);
    const sw = screen.getByRole("switch");

    expect(sw).toHaveClass("opacity-40");
    expect(sw).toHaveClass("cursor-not-allowed");
  });

  it("does NOT apply disabled visual style when enabled", () => {
    render(<Toggle enabled={true} onChange={vi.fn()} />);
    const sw = screen.getByRole("switch");

    expect(sw).not.toHaveClass("cursor-not-allowed");
    expect(sw).toHaveClass("cursor-pointer");
  });

  it("applies danger variant color when enabled", () => {
    render(<Toggle enabled={true} onChange={vi.fn()} variant="danger" />);
    const sw = screen.getByRole("switch");

    // The track background should be the danger color, not secondary.
    expect(sw).toHaveClass("bg-danger");
  });

  it("applies secondary variant color when enabled (default)", () => {
    render(<Toggle enabled={true} onChange={vi.fn()} />);
    const sw = screen.getByRole("switch");

    expect(sw).toHaveClass("bg-secondary");
  });

  it("shows gray track when disabled (off)", () => {
    render(<Toggle enabled={false} onChange={vi.fn()} />);
    const sw = screen.getByRole("switch");

    // When off and not disabled, the track is gray.
    expect(sw).toHaveClass("bg-gray-300");
  });

  it("switches the track translation class based on enabled state", () => {
    const { rerender } = render(<Toggle enabled={true} onChange={vi.fn()} />);
    let sw = screen.getByRole("switch");
    expect(sw.querySelector("span")).toHaveClass("translate-x-5");

    rerender(<Toggle enabled={false} onChange={vi.fn()} />);
    sw = screen.getByRole("switch");
    expect(sw.querySelector("span")).toHaveClass("translate-x-0.5");
  });

  it("respects size='sm' classes", () => {
    render(<Toggle enabled={true} onChange={vi.fn()} size="sm" />);
    const sw = screen.getByRole("switch");

    // sm track = w-8 h-4, sm thumb = w-3 h-3, sm translate = translate-x-4
    expect(sw).toHaveClass("w-8");
    expect(sw).toHaveClass("h-4");
    expect(sw.querySelector("span")).toHaveClass("w-3");
    expect(sw.querySelector("span")).toHaveClass("h-3");
    expect(sw.querySelector("span")).toHaveClass("translate-x-4");
  });

  it("respects default size='md' classes", () => {
    render(<Toggle enabled={true} onChange={vi.fn()} />);
    const sw = screen.getByRole("switch");

    expect(sw).toHaveClass("w-10");
    expect(sw).toHaveClass("h-5");
    expect(sw.querySelector("span")).toHaveClass("w-3.5");
    expect(sw.querySelector("span")).toHaveClass("translate-x-5");
  });
});
