export interface SaveIncomingDocumentDto {
  queueId: string; // incoming_doc_queue.id
  documentFileId: string; // incoming_document_files.id
  subject: string;
  from: string;
  to: string;
  dateReceived: string; // "YYYY-MM-DDTHH:mm" (datetime-local) or "YYYY-MM-DD"
  summary: string;
  routedTo: string[]; // division ids
  noticeOfAction: string;
  actionTaken: string;
}