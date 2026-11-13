import { BadRequestException } from "@nestjs/common";
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
    const { divisionId } = query;

    if (!divisionId) {
      throw new BadRequestException("Only division users can access this request.");
    }

    const { data, nextCursor } =
      await this.assignmentReadRepository.findAllByRoutedDivision(
        divisionId,
        query.filters,
      );

    return {
      data: data.map((assignment) => toIncomingDocumentAssignmentResponse(assignment)),
      nextCursor,
    };
  }
}
