import type { IncomingDocumentStatus } from "../../types/incoming-document.type";

export interface UpdateIncomingDocumentStatusPayload {
  status: IncomingDocumentStatus;
  remarks?: string;
}

export interface UpdateIncomingDocumentStatusVariables {
  id: string;
  payload: UpdateIncomingDocumentStatusPayload;
}
