export type IncomingDocumentStatus = "pending" | "ongoing" | "complete";

export type IncomingDocumentDateField = "uploadDate" | "dateReceived";

export type IncomingDocumentSortOrder =
  | "newestUpload"
  | "oldestUpload"
  | "latestReceived"
  | "subjectAsc";

export interface FindIncomingDocumentsParams {
  limit?: number;
  search?: string;
  status?: IncomingDocumentStatus;
  dateField?: IncomingDocumentDateField;
  startDate?: string;
  endDate?: string;
  sort?: IncomingDocumentSortOrder;
  cursor?: string;
}

export interface IncomingDocumentResponse {
  id: string;
  document_file_id: string;

  file_name: string;
  object_key: string;
  code: string | null;
  tracking_sequence: number | string;

  subject: string;
  document_from: string;
  recipient: string;
  date_received: string;

  status: IncomingDocumentStatus;
  summary: string;

  updated_at: string;
  created_at: string;

  uploader_id: string | null;
  uploader_name: string | null;
}
