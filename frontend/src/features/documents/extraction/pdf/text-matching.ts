import { mergeBoxes } from "./bbox";
import type { BoundingBox, ExtractionToken } from "./types";

const words = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean);

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/** Exact, or within ~25% edit distance for words of 4+ letters (OCR slips). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length) >= 0.75;
}

/**
 * Returns one box covering the longest run of consecutive words of `value`
 * found in `tokens`, or null if nothing convincing matches (caller falls back
 * to the whole chunk box).
 */
export function findValueBox(
  value: string,
  tokens: ExtractionToken[],
): BoundingBox | null {
  const target = words(value);
  // A token like "10/03/2026" becomes 3 words that all point back to one token.
  const pieces = tokens.flatMap((t, tokenIndex) =>
    words(t.text).map((text) => ({ text, tokenIndex })),
  );
  if (!target.length || !pieces.length) return null;

  // Longest common run of consecutive words.
  let best = { len: 0, end: -1 };
  let prev = new Array<number>(target.length + 1).fill(0);
  for (let i = 1; i <= pieces.length; i++) {
    const row = new Array<number>(target.length + 1).fill(0);
    for (let j = 1; j <= target.length; j++) {
      if (sameWord(pieces[i - 1].text, target[j - 1])) {
        row[j] = prev[j - 1] + 1;
        if (row[j] > best.len) best = { len: row[j], end: i - 1 };
      }
    }
    prev = row;
  }

  // Ignore a lone shared word like "of" unless the value itself is one word.
  if (best.len < Math.min(2, target.length)) return null;

  const first = pieces[best.end - best.len + 1].tokenIndex;
  const last = pieces[best.end].tokenIndex;
  return mergeBoxes(tokens.slice(first, last + 1).map((t) => t.bbox));
}
