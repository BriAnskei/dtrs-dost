import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class InvalidateExtractedDocumentQueueDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  response?: string;
}
