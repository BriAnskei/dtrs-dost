import type { IncomingDocumentStatus } from "./incoming-document.type";

export interface IncomingDocumentRow {
  id: string;
  trackingNo: string;
  subject: string;
  documentFrom: string;
  recipient: string;
  dateReceived: string;
  dateUploaded: string;
  status: IncomingDocumentStatus;
}
