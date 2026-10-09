import { v4 as uuidv4 } from "uuid";

export type DocumentDirection = "incoming" | "outgoing";

export function buildDocumentKey(
  direction: DocumentDirection,
  date = new Date(),
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${direction}/${year}/${month}/${uuidv4()}`;
}
