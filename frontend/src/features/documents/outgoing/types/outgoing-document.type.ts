export type OutgoingDocumentSort =
  | "newest"
  | "oldest"
  | "latest_prepared"
  | "subject_asc";

export type OutgoingDocumentDateField = "uploadDate" | "datePrepared" | "dateReceived";

export interface FindOutgoingDocumentsParams {
  limit?: number;
  search?: string;
  dateField?: OutgoingDocumentDateField;
  startDate?: string;
  endDate?: string;
  uploaderId?: string;
  sort?: OutgoingDocumentSort;
  cursor?: string;
}

export interface OutgoingDocumentResponse {
  id: string;
  document_file_id: string;
  file_name: string;
  object_key: string;
  code: string | null;
  tracking_sequence: string;
  subject: string;
  to: string;
  summary: string;
  date_prepared: string | null;
  date_received: string | null;
  received_by: string | null;
  created_at: string;
  uploader_id: string | null;
  uploader_name: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}
