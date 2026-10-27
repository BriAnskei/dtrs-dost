import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import type { Decision } from "../extration-queue.constant";
import { ExtractedDocumentField } from "../types/extracted-types";

export class MyExtractedDocumentQueueResponseDto {
  id!: string;
  file_name!: string;
  decision!: Decision;
  status!: ExtractedDocumentQueueStatus;
  fields!: ExtractedDocumentField[];
  created_at!: Date;
}
