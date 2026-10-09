/**
 * Reusable date formatting utilities.
 *
 * Backend and frontend timestamps are ISO strings. Deployments may not
 * include time-zone info, so we use `undefined` locale (browser default)
 * for date-only and a fixed "en-PH" locale for date-time to keep
 * consistency across machines.
 */

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

/** Format an ISO date string as a localized date (no time). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, DATE_OPTIONS);
}

/** Format an ISO date string as a localized date with time. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", DATETIME_OPTIONS);
}
