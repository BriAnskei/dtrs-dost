import type { CreateIncomingDocumentDto } from "../../extraction/admins/types/create-incoming-document";

export interface CreateIncomingFromQueueResponse {
  id: string;
  documentFileId: string;
  code: string;
}

export interface CreateIncomingFromQueueVariables {
  queueId: string;
  dto: CreateIncomingDocumentDto;
}
