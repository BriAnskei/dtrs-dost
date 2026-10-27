import type { Decision } from "../extration-queue.constant";

export class ExtractedDocumentQueueResponseDto {
  id!: string;

  document_file_id!: string;

  file_name!: string;

  object_key!: string;

  uploader_id!: string | null;

  uploader_name!: string | null;

  decision!: Decision;

  created_at!: Date;
}
