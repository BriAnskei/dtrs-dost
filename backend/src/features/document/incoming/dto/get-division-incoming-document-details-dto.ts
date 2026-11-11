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
  recipient!: string;
  dateReceived!: string;
  createdAt!: Date;
  updatedAt!: Date;

  routingAssignmentCounts!: RoutingAssignmentCountsDto;
}
