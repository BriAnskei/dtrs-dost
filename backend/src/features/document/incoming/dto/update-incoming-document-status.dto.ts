import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { IncomingDocumentStatus } from "../entities/incoming-document-entity";

export class UpdateIncomingDocumentStatusDto {
  @IsEnum(IncomingDocumentStatus)
  status: IncomingDocumentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remarks?: string;
}
