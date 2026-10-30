import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { RoutedDivisionAssigmentsResponse } from "../../dto/routed-division-assigments-response.dto";
import { IncomingDocumentAssignmentsRepository } from "../../repository/incoming-document-assignment.repository";
import { GetIncomingDocumentAssignmentsByRoutingIdQuery } from "./get-incoming-document-assignments-by-routing-id.query";

@QueryHandler(GetIncomingDocumentAssignmentsByRoutingIdQuery)
export class GetIncomingDocumentAssignmentsByRoutingIdHandler
  implements IQueryHandler<GetIncomingDocumentAssignmentsByRoutingIdQuery>
{
  constructor(
    private readonly assignmentsRepository: IncomingDocumentAssignmentsRepository,
  ) {}

  async execute(
    query: GetIncomingDocumentAssignmentsByRoutingIdQuery,
  ): Promise<RoutedDivisionAssigmentsResponse[]> {
    const assignments = await this.assignmentsRepository.findAllByRoutingId(
      query.routingId,
    );

    return assignments.map((assignment) => ({
      id: assignment.id,
      notice_of_action: assignment.notice_of_action,
      notice_description: assignment.notice_description,
      created_at: assignment.created_at,

      created_by: assignment.created_by
        ? {
            name: assignment.created_by.full_name,
            position: assignment.created_by.position,
          }
        : null,

      action_taken: assignment.action_taken,
      action_taken_at: assignment.action_taken_at,

      action_taken_by: assignment.action_taken_by
        ? {
            name: assignment.action_taken_by.full_name,
            position: assignment.action_taken_by.position,
          }
        : null,

      status: assignment.status,
    }));
  }
}
