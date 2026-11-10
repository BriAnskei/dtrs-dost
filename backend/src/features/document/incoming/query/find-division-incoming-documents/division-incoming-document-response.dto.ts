import { IncomingDocumentResponseDto } from "../../dto/incoming-document-response.dto";

export class DivisionIncomingDocumentResponseDto extends IncomingDocumentResponseDto {
  routed_at!: Date;
}
