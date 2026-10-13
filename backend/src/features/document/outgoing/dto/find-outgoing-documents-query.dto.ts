import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { IsValidCursor } from "../../../../common/validators/is-valid-curoser.decorator";
import { OutgoingDocumentDateField } from "../enums/outgoing-document-date-field.enum";
import { OutgoingDocumentSortOrder } from "../enums/outgoing-document-sort-order.enum";

export class FindOutgoingDocumentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(OutgoingDocumentDateField)
  dateField: OutgoingDocumentDateField = OutgoingDocumentDateField.UploadDate;

  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @IsOptional()
  @IsUUID()
  uploaderId?: string;

  @IsOptional()
  @IsEnum(OutgoingDocumentSortOrder)
  sort: OutgoingDocumentSortOrder = OutgoingDocumentSortOrder.NewestUpload;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsValidCursor()
  cursor?: string;
}
