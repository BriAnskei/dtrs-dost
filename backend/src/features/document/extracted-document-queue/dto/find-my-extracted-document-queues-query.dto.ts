import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import type { Decision } from "../extration-queue.constant";
import { DECISION_VALUES } from "../extration-queue.constant";

export enum ExtractedDocumentQueueSort {
  NEWEST = "newest",
  OLDEST = "oldest",
}

export class FindMyExtractedDocumentQueuesQueryDto {
  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsEnum(DECISION_VALUES)
  decision?: Decision;

  @IsOptional()
  @IsEnum(ExtractedDocumentQueueStatus)
  status?: ExtractedDocumentQueueStatus;

  @IsOptional()
  @IsEnum(ExtractedDocumentQueueSort)
  sort?: ExtractedDocumentQueueSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}
