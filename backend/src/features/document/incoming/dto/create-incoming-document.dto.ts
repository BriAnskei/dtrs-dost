import { IsDateString, IsString, MaxLength } from "class-validator";

export class CreateIncomingDocumentDto {
  @IsString()
  @MaxLength(500)
  subject!: string;

  @IsString()
  @MaxLength(255)
  document_from!: string;

  @IsString()
  @MaxLength(255)
  recipient!: string;

  @IsDateString()
  date_received!: string;

  @IsString()
  summary!: string;
}
