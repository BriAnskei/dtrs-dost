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
import { DivisionIncomingDocumentSortOrder } from "../enums/division-incoming-document-sort-order.enum";

export class FindDivisionIncomingDocumentsQueryDto {
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
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @IsOptional()
  @IsEnum(DivisionIncomingDocumentSortOrder)
  sort: DivisionIncomingDocumentSortOrder =
    DivisionIncomingDocumentSortOrder.NewestRouted;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsValidCursor()
  cursor?: string;
}
