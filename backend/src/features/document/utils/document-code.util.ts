import { createHash } from "node:crypto";
import { DocumentDirection } from "../extraction/contants/document-direction";

export function generateDocumentCode(
  direction: DocumentDirection,
  documentId: string,
  attempt = 0,
  year = new Date().getFullYear(),
): string {
  const prefix = direction === "incoming" ? "IN" : "OUT";

  const shortId = createHash("sha256")
    .update(`${documentId}:${attempt}`)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();

  return `${prefix}-${year}-${shortId}`;
}
