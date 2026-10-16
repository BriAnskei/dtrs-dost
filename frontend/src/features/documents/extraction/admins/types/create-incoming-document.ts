export interface CreateIncomingDocumentDto {
  subject: string;
  document_from: string;
  recipient: string;
  date_received: string;
  summary: string;
}

export interface CreateIncomingDocumentInput {
  file: File;
  dto: CreateIncomingDocumentDto;
}

export interface CreateIncomingDocumentResponse {
  id: string;
  documentFileId: string;
  subject: string;
  document_from: string;
  recipient: string;
  date_received: string;
  status: string;
}
