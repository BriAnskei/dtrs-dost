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

/** e.g. "Mon, Nov 17, 2026". Used for day headers. */
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** e.g. "8:14 AM". Created once instead of on every call. */
const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/** Format an ISO date string as a localized date (no time). */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("T")[0].split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    ...DATE_OPTIONS,
    timeZone: "UTC",
  });
}

/** Format an ISO date string as a localized date with time. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, DATETIME_OPTIONS);
}

/** Format an ISO date string as a time only, e.g. "8:14 AM". */
export function formatTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

/** True when both dates fall on the same calendar day in local time. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Human label for a day: "Today", "Yesterday", or e.g. "Mon, Nov 17, 2026".
 * Compared in local time. `now` is injectable so it can be tested.
 */
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  if (isSameLocalDay(date, now)) return "Today";

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return "Yesterday";

  return DAY_LABEL_FORMAT.format(date);
}
