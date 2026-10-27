import { formatDate, formatDateTime } from "../../../../utils/dateFormatter";
import type { OutgoingDocumentResponse } from "../types/outgoing-document.type";
import type { OutgoingDocumentRow } from "../types/outgoing-document-row.type";

export function mapOutgoingDocumentsResponse(
  items: OutgoingDocumentResponse[],
): OutgoingDocumentRow[] {
  return items.map((item) => ({
    id: item.id,
    trackingNo: item.code ?? "—",
    subject: item.subject,
    recipient: item.to,
    datePrepared: item.date_prepared ? formatDate(item.date_prepared) : "-",
    dateUploaded: formatDateTime(item.created_at),
    dateReceived: item.date_received ? formatDate(item.date_received) : "—",
  }));
}
