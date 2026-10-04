import { OPS, type PDFPageProxy } from "pdfjs-dist";

export interface PageAnalysis {
  hasNativeText: boolean;
  hasImages: boolean;
}

export async function analyzePage(page: PDFPageProxy): Promise<PageAnalysis> {
  const textContent = await page.getTextContent();

  const hasNativeText = textContent.items.some(
    (item) => "str" in item && typeof item.str === "string" && item.str.trim().length > 0,
  );

  const operatorList = await page.getOperatorList();

  const hasImages = operatorList.fnArray.some(
    (operator) =>
      operator === OPS.paintImageMaskXObject ||
      operator === OPS.paintImageMaskXObjectRepeat ||
      operator === OPS.paintImageXObject ||
      operator === OPS.paintInlineImageXObject,
  );

  return {
    hasNativeText,
    hasImages,
  };
}
