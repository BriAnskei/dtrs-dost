import { IncomingDocumentStatus } from "../entities/incoming-document-entity";

export class IncomingDocumentDetailsDto {
  id!: string;
  document_file_id!: string;

  file_name!: string;
  object_key!: string;
  code!: string | null;

  tracking_sequence!: string;

  subject!: string;
  document_from!: string;
  recipient!: string;
  date_received!: string;

  status!: IncomingDocumentStatus;
  summary!: string;

  updated_at!: Date;
  created_at!: Date;

  uploader_id!: string | null;
  uploader_name!: string | null;

  assignments!: number;
  in_progress_assignment_count!: number;
  action_taken_count!: number;
  assigned_division_count!: number;
}
