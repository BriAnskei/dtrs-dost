/**
 * Anti-hallucination text matching for extracted field values.
 *
 * The backend only receives raw chunk text (no OCR/word-level tokens), so the
 * "is this LLM-returned value really backed by the source document?" check must
 * be tolerant of two things the pipeline actually produces:
 *
 *   1. OCR character slips ("Provincial" -> "Provirjcial") and dropped/reordered
 *      words.
 *   2. Cross-chunk value reconstruction: an LLM that rebuilds a multi-line
 *      value from several chunks often omits the connecting text between the
 *      cited chunks (e.g. a date label sitting between two name lines). A strict
 *      substring test then false-positives as a hallucination and throws 400.
 *
 * The logic intentionally mirrors the frontend `findValueBox` word matcher
 * (text-matching-helpers) so the server and client agree on what "present"
 * means.
 */

/** Lowercase, NFKC, alphanumeric words only. */
function tokenize(value: string): string[] {
  return value
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean);
}

function normalizeText(value: string): string {
  return tokenize(value).join(" ");
}

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

/** Exact match, or within ~25% edit distance for words of 4+ letters (OCR slips). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;

  if (a.length < 4 || b.length < 4) return false;

  return 1 - levenshtein(a, b) / Math.max(a.length, b.length) >= 0.75;
}

/** Fraction of value words that must match (in order) before treating a value as real. */
const VALUE_COVERAGE_THRESHOLD = 0.8;

/**
 * True when `value` is present in `text`, tolerating OCR noise and the word gaps
 * a value acquires when it spans several chunks.
 *
 *  1. Fast path: a normalized exact substring match. Covers clean native text
 *     and verbatim-copied values, and preserves the existing guarantee that a
 *     reformatted value (e.g. a date "October 3, 2026" -> "2026-10-03") still
 *     fails, since the reformatted words are not present verbatim.
 *  2. Fuzzy path: the value's words must appear in `text` in order
 *     (subsequence), with per-word tolerance for OCR character slips. At least
 *     `VALUE_COVERAGE_THRESHOLD` of the value's words must match in order;
 *     below that the value is treated as a hallucination.
 */
export function valueInDocument(value: string, text: string): boolean {
  const valueWords = tokenize(value);

  if (valueWords.length === 0) {
    return false;
  }

  if (normalizeText(text).includes(normalizeText(value))) {
    return true;
  }

  const docWords = tokenize(text);

  let matched = 0;

  let docIdx = 0;

  for (let v = 0; v < valueWords.length && docIdx < docWords.length; v++) {
    const target = valueWords[v];

    while (docIdx < docWords.length && !sameWord(docWords[docIdx], target)) {
      docIdx++;
    }

    if (docIdx < docWords.length) {
      matched++;

      docIdx++;
    } else {
      break;
    }
  }

  return matched / valueWords.length >= VALUE_COVERAGE_THRESHOLD;
}
