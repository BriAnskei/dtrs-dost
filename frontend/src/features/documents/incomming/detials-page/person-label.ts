/** Initials helper for the user avatar. */

const SUFFIX_TOKEN = /^(jr|sr|ii|iii|iv)\.?$/i;

const normalize = (value: string) => value.trim().replace(/\s+/g, " ");

/** First + last initial, ignoring suffixes. "" when there is no usable name. */
export function getInitials(name: string | null | undefined): string {
  const tokens = normalize(name ?? "")
    .split(" ")
    .filter((t) => t && !SUFFIX_TOKEN.test(t));
  if (tokens.length === 0) return "";

  const first = [...tokens[0]][0] ?? "";
  const last = tokens.length > 1 ? ([...tokens[tokens.length - 1]][0] ?? "") : "";
  return (first + last).toUpperCase();
}
