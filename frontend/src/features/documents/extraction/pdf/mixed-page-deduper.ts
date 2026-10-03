import type { ExtractionChunk } from "./types";

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateIoU(
  a: NonNullable<ExtractionChunk["bbox"]>,
  b: NonNullable<ExtractionChunk["bbox"]>,
): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);

  const right = Math.min(a.x + a.width, b.x + b.width);

  const bottom = Math.min(a.y + a.height, b.y + b.height);

  if (right <= left || bottom <= top) {
    return 0;
  }

  const intersection = (right - left) * (bottom - top);

  const areaA = a.width * a.height;

  const areaB = b.width * b.height;

  const union = areaA + areaB - intersection;

  if (union <= 0) {
    return 0;
  }

  return intersection / union;
}

function isDuplicate(nativeChunk: ExtractionChunk, ocrChunk: ExtractionChunk): boolean {
  if (!nativeChunk.bbox || !ocrChunk.bbox) {
    return normalizeText(nativeChunk.text) === normalizeText(ocrChunk.text);
  }

  const textMatches = normalizeText(nativeChunk.text) === normalizeText(ocrChunk.text);

  if (textMatches) {
    return true;
  }

  const overlap = calculateIoU(nativeChunk.bbox, ocrChunk.bbox);

  return overlap >= 0.5;
}

export function deduplicateMixedPage(chunks: ExtractionChunk[]): ExtractionChunk[] {
  const nativeChunks = chunks.filter((chunk) => chunk.source === "text");

  const ocrChunks = chunks.filter((chunk) => chunk.source === "ocr");

  const uniqueOcr = ocrChunks.filter(
    (ocrChunk) => !nativeChunks.some((nativeChunk) => isDuplicate(nativeChunk, ocrChunk)),
  );

  return [...nativeChunks, ...uniqueOcr].sort(
    (a, b) => (a.bbox?.y ?? 0) - (b.bbox?.y ?? 0) || (a.bbox?.x ?? 0) - (b.bbox?.x ?? 0),
  );
}
