import { IncomingDocumentStatus } from "../entities/incoming-document-entity";

export interface IncomingDocumentStatusHistoryCursor {
  id: string;
}

export interface CreateStatusHistoryParams {
  incoming_document_id: string;
  status_from: IncomingDocumentStatus;
  status_to: IncomingDocumentStatus;
  remarks: string | null;
  changed_by: string;
}
