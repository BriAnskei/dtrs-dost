import type { OutgoingDocumentResponse } from "../types/outgoing-document.type";
import type { OutgoingDocumentRow } from "../types/outgoing-document-row.type";
import { formatDateOnly, formatTimestamp } from "./FormatDate";

export function mapOutgoingDocumentsResponse(
  items: OutgoingDocumentResponse[],
): OutgoingDocumentRow[] {
  return items.map((item) => ({
    id: item.id,
    trackingNo: item.code ?? "—",
    subject: item.subject,
    recipient: item.to,
    datePrepared: formatDateOnly(item.date_prepared),
    dateUploaded: formatTimestamp(item.created_at),
  }));
}
