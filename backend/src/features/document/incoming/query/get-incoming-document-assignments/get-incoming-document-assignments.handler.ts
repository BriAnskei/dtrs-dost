import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { PaginatedResponse } from "../../../../../common/pagination/paginated-response";
import { toIncomingDocumentAssignmentResponse } from "../../mapper/incoming-document-assignment-mapper";
import { IncomingDocumentAssignmentsReadRepository } from "../../repository/incoming-document-assignment-repository/incoming-document-assignment.read.repository";
import { IncomingDocumentAssignmentResponse } from "../../types/get-incoming-document-assignment.type";
import { GetIncomingDocumentAssignmentsQuery } from "./get-incoming-document-assignments.query";

@QueryHandler(GetIncomingDocumentAssignmentsQuery)
export class GetIncomingDocumentAssignmentsHandler
  implements IQueryHandler<GetIncomingDocumentAssignmentsQuery>
{
  constructor(
    private readonly assignmentReadRepository: IncomingDocumentAssignmentsReadRepository,
  ) {}

  async execute(
    query: GetIncomingDocumentAssignmentsQuery,
  ): Promise<PaginatedResponse<IncomingDocumentAssignmentResponse>> {
    const { data, nextCursor } =
      await this.assignmentReadRepository.findAllByIncomingDocumentId(
        query.incomingDocumentId,
        query.filters,
      );

    return {
      data: data.map((assignment) => toIncomingDocumentAssignmentResponse(assignment)),
      nextCursor,
    };
  }
}
