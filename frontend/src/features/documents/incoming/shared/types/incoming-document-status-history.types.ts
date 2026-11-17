import type { IncomingDocumentStatus } from "../../types/incoming-document.type";

export interface IncomingDocumentStatusHistory {
  id: string;
  incoming_document_id: string;

  status_from: IncomingDocumentStatus;
  status_to: IncomingDocumentStatus;

  remarks: string | null;

  changed_by: string | null;
  changed_by_user: {
    id: string;
    full_name: string;
    position: string | null;
  } | null;

  created_at: string;
}

export interface IncomingDocumentStatusHistoryParams {
  limit?: number;
  startDate?: string;
  endDate?: string;
  cursor?: string;
}

