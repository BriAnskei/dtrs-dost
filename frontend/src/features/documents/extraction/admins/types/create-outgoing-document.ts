export interface CreateOutgoingDocumentDto {
  subject: string;
  to: string;
  date_prepared?: string | null;
  date_received?: string | null;
  summary?: string | null;
  received_by?: string | null;
}

export interface CreateOutgoingDocumentResponse {
  id: string;
  documentFileId: string;
  code: string;
}
