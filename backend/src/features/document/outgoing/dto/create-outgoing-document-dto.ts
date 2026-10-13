import { IsDateString, IsString, MaxLength } from "class-validator";

export class CreateOutgoingDocumentDto {
  @IsString()
  @MaxLength(500)
  subject!: string;

  @IsString()
  @MaxLength(255)
  to!: string;

  @IsString()
  summary!: string;

  @IsDateString()
  date_prepared!: string;

  @IsDateString()
  date_received!: string;

  @IsString()
  @MaxLength(255)
  received_by!: string;
}
