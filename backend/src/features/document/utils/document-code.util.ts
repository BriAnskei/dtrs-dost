import { DocumentDirection } from "../extraction/contants/document-direction";

export function generateDocumentCode(
  direction: DocumentDirection,
  sequence: string | number,
  year = new Date().getFullYear(),
): string {
  const prefix = direction === "incoming" ? "IN" : "OUT";
  const sequenceNumber = String(sequence).padStart(6, "0");

  return `${prefix}-${year}-${sequenceNumber}`;
}
