const EMPTY = "—";

const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/**
 * Formats a date-only string ("YYYY-MM-DD", e.g. a PostgreSQL DATE column).
 * Built from its parts so the day never shifts with the viewer's timezone.
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return EMPTY;

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return EMPTY;

  return formatter.format(new Date(year, month - 1, day));
}

/** Formats an ISO timestamp (e.g. created_at) in the viewer's local timezone. */
export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return EMPTY;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : formatter.format(date);
}
