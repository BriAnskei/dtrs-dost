import { AssignmentStatus } from "../enums/assignment-status.enum";

export interface IncomingDocumentDetailsRaw {
  id: string;
  code: string | null;
  subject: string;
  summary: string;
  sender: string;
  status: AssignmentStatus;
  recipient: string;
  dateReceived: string;
  createdAt: Date;
  updatedAt: Date;
  routingAssignmentTotal: string;
  routingAssignmentOngoing: string;
  routingAssignmentComplete: string;
}
