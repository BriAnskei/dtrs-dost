import { Query } from "@nestjs/cqrs";
import { PaginatedResponse } from "../../../../../common/pagination/paginated-response";
import {
  GetIncomingDocumentAssignmentsFilters,
  IncomingDocumentAssignmentResponse,
} from "../../types/get-incoming-document-assignment.type";

export class GetIncomingDocumentAssignmentsQuery extends Query<
  PaginatedResponse<IncomingDocumentAssignmentResponse>
> {
  constructor(
    public readonly incomingDocumentId: string,
    public readonly filters: GetIncomingDocumentAssignmentsFilters,
  ) {
    super();
  }
}
