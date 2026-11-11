import { Query } from "@nestjs/cqrs";
import { RoutedIncomingDocumentDetailsDto } from "../../dto/get-division-incoming-document-details-dto";

export class GetIncomingDocumentDetailsQuery extends Query<RoutedIncomingDocumentDetailsDto> {
  constructor(
    public readonly incomingDocumentId: string,
    public readonly divisionId: string,
  ) {
    super();
  }
}
