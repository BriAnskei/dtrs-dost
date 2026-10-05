/**
 * Unit tests for `ExtractionConsole` — the log display shown during extraction.
 *
 * THE COMPONENT (components/ExtractionConsole.tsx):
 *
 *   Props:
 *     - logs: LogEntry[]  ({ id, time, level, message })[]
 *     - phase: ExtractionPhase
 *
 * Rendering rules:
 *   - Renders one <div key={l.id}> per log entry, showing time, level tag, message.
 *   - Level tags: info→"INFO" (blue), success→"OK" (green), warn→"WARN" (amber), error→"FAIL" (red).
 *   - A running indicator (animate-pulse dot) shows when phase is "source" or "llm".
 *   - The container has role="log" and aria-live="polite".
 *   - useEffect scrolls to bottom when logs change.
 *
 * Tests use a mocked ResizeObserver-free happy-dom. We assert on visible content
 * and ARIA attributes. Scroll behavior is tested via the ref + scrollTop assignment
 * indirectly (happy-dom doesn't fully implement scrollHeight, but the effect runs
 * without error).
 */

import { render, screen } from "@testing-library/react";
import { act } from "react"; // vitest's act re-export from react for useEffect timing
import { describe, expect, it } from "vitest";

import ExtractionConsole from "../admins/components/ExtractionConsole";
import type { LogEntry, LogLevel } from "../types/extraction-types";

function makeLog(level: LogLevel, message: string, id = 1, time = "12:00"): LogEntry {
  return { id, time, level, message };
}

describe("ExtractionConsole", () => {
  describe("log rendering", () => {
    it("renders one row per log entry", () => {
      const logs = [
        makeLog("info", "Starting", 1),
        makeLog("success", "Done", 2),
        makeLog("warn", "Warning", 3),
        makeLog("error", "Failed", 4),
      ];

      render(<ExtractionConsole logs={logs} phase="done" />);

      // Each log entry's message should appear.
      expect(screen.getByText("Starting")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
      expect(screen.getByText("Warning")).toBeInTheDocument();
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("renders the timestamp for each entry", () => {
      const logs = [makeLog("info", "Msg", 1, "14:30")];
      render(<ExtractionConsole logs={logs} phase="done" />);

      expect(screen.getByText("14:30")).toBeInTheDocument();
    });

    it("renders nothing (no log rows) when logs is empty", () => {
      const { container } = render(<ExtractionConsole logs={[]} phase="idle" />);

      // No log rows — only the container. The running indicator should NOT
      // appear because phase "idle" is not "source" or "llm".
      expect(container.querySelectorAll('[class*="flex gap-2"]')).toHaveLength(0);
    });
  });

  describe("level tags", () => {
    it("renders 'INFO' tag for info-level logs", () => {
      render(<ExtractionConsole logs={[makeLog("info", "msg")]} phase="done" />);
      expect(screen.getByText("INFO")).toBeInTheDocument();
    });

    it("renders 'OK' tag for success-level logs", () => {
      render(<ExtractionConsole logs={[makeLog("success", "msg")]} phase="done" />);
      expect(screen.getByText("OK")).toBeInTheDocument();
    });

    it("renders 'WARN' tag for warn-level logs", () => {
      render(<ExtractionConsole logs={[makeLog("warn", "msg")]} phase="done" />);
      expect(screen.getByText("WARN")).toBeInTheDocument();
    });

    it("renders 'FAIL' tag for error-level logs", () => {
      render(<ExtractionConsole logs={[makeLog("error", "msg")]} phase="done" />);
      expect(screen.getByText("FAIL")).toBeInTheDocument();
    });
  });

  describe("running indicator", () => {
    it("shows a pulse dot when phase is 'source'", () => {
      const { container } = render(
        <ExtractionConsole logs={[makeLog("info", "msg")]} phase="source" />,
      );

      const dot = container.querySelector(".animate-pulse");
      expect(dot).not.toBeNull();
    });

    it("shows a pulse dot when phase is 'llm'", () => {
      const { container } = render(
        <ExtractionConsole logs={[makeLog("info", "msg")]} phase="llm" />,
      );

      const dot = container.querySelector(".animate-pulse");
      expect(dot).not.toBeNull();
    });

    it("does NOT show a pulse dot when phase is 'done'", () => {
      const { container } = render(
        <ExtractionConsole logs={[makeLog("info", "msg")]} phase="done" />,
      );

      const dot = container.querySelector(".animate-pulse");
      expect(dot).toBeNull();
    });

    it("does NOT show a pulse dot when phase is 'idle'", () => {
      const { container } = render(
        <ExtractionConsole logs={[]} phase="idle" />,
      );

      const dot = container.querySelector(".animate-pulse");
      expect(dot).toBeNull();
    });

    it("does NOT show a pulse dot when phase is 'failed'", () => {
      const { container } = render(
        <ExtractionConsole logs={[makeLog("error", "msg")]} phase="failed" />,
      );

      const dot = container.querySelector(".animate-pulse");
      expect(dot).toBeNull();
    });
  });

  describe("accessibility", () => {
    it("container has role='log'", () => {
      const { container } = render(
        <ExtractionConsole logs={[]} phase="idle" />,
      );

      expect(container.querySelector('[role="log"]')).not.toBeNull();
    });

    it("container has aria-live='polite'", () => {
      const { container } = render(
        <ExtractionConsole logs={[]} phase="idle" />,
      );

      expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
    });
  });

  describe("empty logs with running phase", () => {
    it("shows the pulse dot but no log rows when phase is 'source' and logs is empty", () => {
      const { container } = render(
        <ExtractionConsole logs={[]} phase="source" />,
      );

      expect(container.querySelector(".animate-pulse")).not.toBeNull();
      // No log message divs.
      expect(screen.queryByText("INFO")).not.toBeInTheDocument();
    });
  });
});
