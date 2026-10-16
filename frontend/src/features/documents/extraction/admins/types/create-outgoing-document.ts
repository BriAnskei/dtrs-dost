export interface CreateOutgoingDocumentDto {
  subject: string;
  to: string;
  date_prepared: string;
  date_received: string;
  summary: string;
  received_by: string;
}

export interface CreateOutgoingDocumentResponse {
  id: string;
  documentFileId: string;
  code: string;
}

export interface CreateOutgoingDocumentInput {
  file: File;
  dto: CreateOutgoingDocumentDto;
}
