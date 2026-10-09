import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import type { Decision } from "../extration-queue.constant";

export class MyExtractedDocumentQueueResponseDto {
  id!: string;
  file_name!: string;
  decision!: Decision;
  status!: ExtractedDocumentQueueStatus;
  created_at!: Date;
}
