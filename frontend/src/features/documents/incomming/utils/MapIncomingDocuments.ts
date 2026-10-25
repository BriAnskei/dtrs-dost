import { formatDate, formatDateTime } from "../../../../utils/dateFormatter";
import type { IncomingDocumentResponse } from "../types/incoming-document.type";
import type { IncomingDocumentRow } from "../types/incoming-document-row.type";

export function mapIncomingDocumentsResponse(
  items: IncomingDocumentResponse[],
): IncomingDocumentRow[] {
  return items.map((item) => ({
    id: item.id,
    trackingNo: item.code ?? "—",
    subject: item.subject,
    documentFrom: item.document_from,
    recipient: item.recipient,
    dateReceived: item.date_received ? formatDate(item.date_received) : "—",
    dateUploaded: formatDateTime(item.created_at),
    status: item.status,
    summary: item.summary,
    uploaderName: item.uploader_name ?? "—",
    fileName: item.file_name,
  }));
}
