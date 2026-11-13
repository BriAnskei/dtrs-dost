export interface RoutedIncomingDocumentDetailsDto {
  id: string;
  code: string | null;
  subject: string;
  summary: string | null;
  sender: string;
  recipient: string;
  status: "pending" | "ongoing" | "complete";
  dateReceived: string;
  createdAt: string;
  updatedAt: string;
  routingAssignmentCounts: {
    total: string;
    ongoing: string;
    complete: string;
  };
}
