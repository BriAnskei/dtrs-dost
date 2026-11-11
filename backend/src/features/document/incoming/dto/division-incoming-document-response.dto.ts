import { IncomingDocumentStatus } from "../entities/incoming-document-entity";

export class DivisionIncomingDocumentResponseDto {
  id: string;
  code: string | null;
  subject: string;
  status: IncomingDocumentStatus;
  routed_at: Date;
}
