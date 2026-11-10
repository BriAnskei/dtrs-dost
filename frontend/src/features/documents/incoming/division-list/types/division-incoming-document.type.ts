import type { IncomingDocumentStatus } from "../../types/incoming-document.type";

export type DivisionIncomingDocumentSortOrder = "newestRouted" | "oldestRouted";

export interface FindDivisionIncomingDocumentsParams {
  limit?: number;
  search?: string;
  status?: IncomingDocumentStatus;
  startDate?: string;
  endDate?: string;
  sort?: DivisionIncomingDocumentSortOrder;
  cursor?: string;
}

export interface DivisionIncomingDocument {
  id: string;
  code: string | null;
  subject: string;
  recipient: string;
  status: IncomingDocumentStatus;
  routed_at: string;
}
