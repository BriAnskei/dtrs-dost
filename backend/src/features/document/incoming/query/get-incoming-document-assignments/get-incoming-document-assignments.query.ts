import { Query } from "@nestjs/cqrs";
import {
  GetIncomingDocumentAssignmentsFilters,
  IncomingDocumentAssignmentResponse,
} from "../../types/get-incoming-document-assignment.type";

export class GetIncomingDocumentAssignmentsQuery extends Query<
  IncomingDocumentAssignmentResponse[]
> {
  constructor(
    public readonly incomingDocumentId: string,
    public readonly filters: GetIncomingDocumentAssignmentsFilters,
  ) {
    super();
  }
}
