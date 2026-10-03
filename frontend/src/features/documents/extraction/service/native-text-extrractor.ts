import type { PDFPageProxy } from "pdfjs-dist";
import type { TextItem } from "react-pdf";
import { PDF_EXTRACTION_CONFIG } from "../pdf/config";
import type {
  BoundingBox,
  ExtractionChunk,
  ExtractionToken,
} from "../types/extraction-config-type";

interface TextFragment {
  text: string;

  x: number;
  y: number;

  width: number;
  height: number;
}

function isTextItem(item: unknown): item is TextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    "transform" in item &&
    "width" in item &&
    "height" in item
  );
}

function normalizePdfY(y: number, height: number): number {
  return height - y;
}

function createBoundingBox(
  fragment: TextFragment,
  pageWidth: number,
  pageHeight: number,
): BoundingBox {
  const left = fragment.x;
  const top = normalizePdfY(fragment.y, pageHeight);

  return {
    x: left / pageWidth,
    y: (top - fragment.height) / pageHeight,
    width: fragment.width / pageWidth,
    height: fragment.height / pageHeight,
  };
}

function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
  const left = Math.min(...boxes.map((box) => box.x));

  const top = Math.min(...boxes.map((box) => box.y));

  const right = Math.max(...boxes.map((box) => box.x + box.width));

  const bottom = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function groupIntoLines(fragments: TextFragment[]): TextFragment[][] {
  const lines: TextFragment[][] = [];

  for (const fragment of fragments) {
    const centerY = fragment.y + fragment.height / 2;

    let line = lines.find((candidate) => {
      const first = candidate[0];

      const firstCenterY = first.y + first.height / 2;

      return Math.abs(centerY - firstCenterY) <= Math.max(fragment.height, first.height);
    });

    if (!line) {
      line = [];
      lines.push(line);
    }

    line.push(fragment);
  }

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
  }

  lines.sort((a, b) => {
    const ay = a[0].y;
    const by = b[0].y;

    return ay - by;
  });

  return lines;
}

export async function extractNativeText(
  page: PDFPageProxy,
  pageNumber: number,
): Promise<ExtractionChunk[]> {
  const textContent = await page.getTextContent();

  const viewport = page.getViewport({ scale: 1 });

  const fragments: TextFragment[] = [];

  for (const item of textContent.items) {
    if (!isTextItem(item)) {
      continue;
    }

    const text = item.str.trim();

    if (text.length < PDF_EXTRACTION_CONFIG.minTextFragmentLength) {
      continue;
    }

    fragments.push({
      text,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      height: item.height,
    });
  }

  const lines = groupIntoLines(fragments);

  return lines.map((line, index): ExtractionChunk => {
    const tokens: ExtractionToken[] = line.map((fragment) => ({
      text: fragment.text,
      bbox: createBoundingBox(fragment, viewport.width, viewport.height),
    }));

    const bbox = mergeBoundingBoxes(tokens.map((token) => token.bbox));

    return {
      chunkId: `p${pageNumber}-t${index + 1}`,
      text: line.map((fragment) => fragment.text).join(" "),
      source: "text",
      confidence: PDF_EXTRACTION_CONFIG.nativeTextConfidence,
      bbox,
      tokens,
    };
  });
}
