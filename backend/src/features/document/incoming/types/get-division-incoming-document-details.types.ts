export interface IncomingDocumentDetailsRaw {
  id: string;
  code: string | null;
  subject: string;
  summary: string;
  sender: string;
  recipient: string;
  dateReceived: string;
  createdAt: Date;
  updatedAt: Date;
  routingAssignmentTotal: string;
  routingAssignmentOngoing: string;
  routingAssignmentComplete: string;
}
