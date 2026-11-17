import { IncomingDocumentStatus } from "../entities/incoming-document-entity";

export class IncomingDocumentStatusHistoryResponseDto {
  id!: string;

  incoming_document_id!: string;

  status_from!: IncomingDocumentStatus;

  status_to!: IncomingDocumentStatus;

  remarks!: string | null;

  changed_by!: string | null;

  changed_by_user!: {
    id: string;
    full_name: string;
    position: string | null;
  } | null;

  created_at!: Date;
}
