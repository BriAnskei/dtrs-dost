import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  DECISION_VALUES,
  type Decision,
  EXTRACTED_DOCUMENT_QUEUE_SORT_VALUES,
  type ExtractedDocumentQueueSort,
} from "../extration-queue.constant";

export class FindExtractedDocumentQueuesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  uploader_name?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unknown_uploader?: boolean;

  @IsOptional()
  @IsEnum(DECISION_VALUES)
  decision?: Decision;

  @IsOptional()
  @IsEnum(EXTRACTED_DOCUMENT_QUEUE_SORT_VALUES)
  sort: ExtractedDocumentQueueSort = "newest";
}
