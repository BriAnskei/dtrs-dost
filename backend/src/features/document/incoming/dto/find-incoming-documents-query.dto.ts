import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { IsValidCursor } from "../../../../common/validators/is-valid-curoser.decorator";
import { IncomingDocumentStatus } from "../entities/incoming-document-entity";
import { IncomingDocumentDateField } from "../enums/incoming-document-date-field.enum";
import { IncomingDocumentSortOrder } from "../enums/incoming-document-sort-order.enum";

export class FindIncomingDocumentsQueryDto {
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
  @IsEnum(IncomingDocumentStatus)
  status?: IncomingDocumentStatus;

  @IsOptional()
  @IsEnum(IncomingDocumentDateField)
  dateField: IncomingDocumentDateField = IncomingDocumentDateField.UploadDate;

  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @IsOptional()
  @IsEnum(IncomingDocumentSortOrder)
  sort: IncomingDocumentSortOrder = IncomingDocumentSortOrder.NewestUpload;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsValidCursor()
  cursor?: string;
}
