/** Dates are "YYYY-MM-DD" strings, "" when unset — the shape the API takes. */
export interface DateRange {
  start: string;
  end: string;
}

export interface DateRangePreset {
  label: string;
  /** Resolved when clicked, so "Today" is always today. */
  getRange: () => DateRange;
}

export const EMPTY_RANGE: DateRange = { start: "", end: "" };

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-calendar "YYYY-MM-DD". Never use toISOString() here: it shifts the day in UTC+ zones. */
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseYmd(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function hasRange(range: DateRange): boolean {
  return range.start !== "" || range.end !== "";
}

export function isSameRange(a: DateRange, b: DateRange): boolean {
  return a.start === b.start && a.end === b.end;
}

const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fullDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * "Oct 1, 2026"                single day
 * "Oct 1 – Oct 15, 2026"       same year
 * "Dec 20, 2025 – Jan 5, 2026" across years
 * "From Oct 1, 2026" / "Until Oct 15, 2026" for open-ended values
 */
export function formatRangeLabel(range: DateRange): string {
  const start = range.start ? parseYmd(range.start) : null;
  const end = range.end ? parseYmd(range.end) : null;

  if (start && end) {
    if (range.start === range.end) return fullDate.format(start);
    if (start.getFullYear() === end.getFullYear()) {
      return `${monthDay.format(start)} – ${fullDate.format(end)}`;
    }
    return `${fullDate.format(start)} – ${fullDate.format(end)}`;
  }
  if (start) return `From ${fullDate.format(start)}`;
  if (end) return `Until ${fullDate.format(end)}`;
  return "";
}

function dayOffset(days: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
}

export const DEFAULT_DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    label: "Today",
    getRange: () => ({ start: toYmd(dayOffset(0)), end: toYmd(dayOffset(0)) }),
  },
  {
    label: "Last 7 days",
    getRange: () => ({ start: toYmd(dayOffset(-6)), end: toYmd(dayOffset(0)) }),
  },
  {
    label: "Last 30 days",
    getRange: () => ({ start: toYmd(dayOffset(-29)), end: toYmd(dayOffset(0)) }),
  },
  {
    label: "This month",
    getRange: () => {
      const now = new Date();
      return {
        start: toYmd(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: toYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    },
  },
  {
    label: "Last month",
    getRange: () => {
      const now = new Date();
      return {
        start: toYmd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: toYmd(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    label: "This year",
    getRange: () => {
      const year = new Date().getFullYear();
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    },
  },
];
