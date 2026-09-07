export type DocumentType = "incoming" | "outgoing";
export type ExtractionStatus = "idle" | "extracting" | "done" | "error";

export interface IncomingMetadata {
  idCode: string;
  subject: string;
  from: string;
  to: string;
  dateReceived: string;
  summary: string;
  routedTo: string;
  noticeOfAction: string;
  actionTaken: string;
}

export interface OutgoingMetadata {
  idCode: string;
  to: string;
  datePrepared: string;
  subject: string;
  dateReceived: string;
  receivedBy: string;
}

export interface ExtractionResponseType {
  subject: string;
  from: string;
  to: string;
  date_received: string;
  time_received: string;
  summary: string;
}
