export interface IncomingDocumentDetailsDto {
  subject: string;
  from: string;
  to: string;
  date_received: string;
  summary: string;
  updated_at: string;
  created_at: string;
  status: "pending" | "ongoing" | "complete";
}

export interface InvalidationResponseDto {
  response: string;
  created_at: string;
}

export type ReceiverQueueDetailsDto =
  | IncomingDocumentDetailsDto
  | InvalidationResponseDto
  | null;
