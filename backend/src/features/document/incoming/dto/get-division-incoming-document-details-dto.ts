import { AssignmentStatus } from "../enums/assignment-status.enum";

export class RoutingAssignmentCountsDto {
  total!: string;
  ongoing!: string;
  complete!: string;
}

export class RoutedIncomingDocumentDetailsDto {
  id!: string;
  code!: string | null;
  subject!: string;
  summary!: string;
  sender!: string;
  status!: AssignmentStatus;
  recipient!: string;
  dateReceived!: string;
  createdAt!: Date;
  updatedAt!: Date;

  routingAssignmentCounts!: RoutingAssignmentCountsDto;
}
