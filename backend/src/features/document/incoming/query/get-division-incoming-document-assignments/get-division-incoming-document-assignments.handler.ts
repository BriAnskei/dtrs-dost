import { ForbiddenException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { PaginatedResponse } from "../../../../../common/pagination/paginated-response";
import { toIncomingDocumentAssignmentResponse } from "../../mapper/incoming-document-assignment-mapper";
import { IncomingDocumentAssignmentsReadRepository } from "../../repository/incoming-document-assignment-repository/incoming-document-assignment.read.repository";
import { IncomingDocumentAssignmentResponse } from "../../types/get-incoming-document-assignment.type";
import { GetDivisionIncomingDocumentAssignmentsQuery } from "./get-division-incoming-document-assignments.query";

@QueryHandler(GetDivisionIncomingDocumentAssignmentsQuery)
export class GetDivisionIncomingDocumentAssignmentsHandler
  implements IQueryHandler<GetDivisionIncomingDocumentAssignmentsQuery>
{
  constructor(
    private readonly assignmentReadRepository: IncomingDocumentAssignmentsReadRepository,
  ) {}

  async execute(
    query: GetDivisionIncomingDocumentAssignmentsQuery,
  ): Promise<PaginatedResponse<IncomingDocumentAssignmentResponse>> {
    const { incomingDocumentId, divisionId, filters } = query;

    // Division is extracted from the jwt handler, if there is no division added
    // this user is not assignment to division, and cannot retrive details of assignments
    if (!divisionId) {
      throw new ForbiddenException(
        "Division users can only access assignments associated with their division.",
      );
    }

    const { data, nextCursor } =
      await this.assignmentReadRepository.findAllByRoutedDivision(
        incomingDocumentId,
        divisionId,
        filters,
      );

    return {
      data: data.map(toIncomingDocumentAssignmentResponse),
      nextCursor,
    };
  }
}
