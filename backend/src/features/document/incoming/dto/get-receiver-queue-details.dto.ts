import { IncomingDocumentStatus } from "../entities/incoming-document-entity";

export class ReceiverIncomingDocumentDetailsDto {
  subject!: string;
  from!: string;
  to!: string;
  date_received!: string;
  summary!: string;
  updated_at!: Date;
  created_at!: Date;
  status!: IncomingDocumentStatus;
}

export class ReceiverInvalidationResponseDto {
  response!: string;
  created_at!: Date;
}
