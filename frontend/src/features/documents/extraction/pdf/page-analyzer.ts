import type { PDFPageProxy } from "pdfjs-dist";
import { OPS } from "pdfjs-dist";

export interface PageAnalysis {
  hasNativeText: boolean;
  hasImages: boolean;
}

export async function analyzePage(
  page: PDFPageProxy,
  nativeTextLength: number,
): Promise<PageAnalysis> {
  const operatorList = await page.getOperatorList();

  let hasImages = false;

  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];

    if (
      fn === OPS.paintImageMaskXObject ||
      fn === OPS.paintImageMaskXObjectRepeat ||
      fn === OPS.paintImageXObject ||
      fn === OPS.paintImageXObjectRepeat
    ) {
      hasImages = true;
      break;
    }
  }

  return {
    hasNativeText: nativeTextLength > 0,
    hasImages,
  };
}
