export class OutgoingDocumentResponseDto {
  id!: string;
  document_file_id!: string;
  file_name!: string;
  object_key!: string;
  code!: string | null;
  tracking_sequence!: string;
  subject!: string;
  to!: string;
  summary!: string;
  date_prepared!: string | null;
  date_received!: string | null;
  received_by!: string | null;
  created_at!: Date;
  uploader_id!: string | null;
  uploader_name!: string | null;
}
