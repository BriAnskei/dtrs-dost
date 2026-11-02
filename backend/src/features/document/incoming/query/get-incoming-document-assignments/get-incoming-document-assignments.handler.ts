import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { PaginatedResponse } from "../../../../../common/pagination/paginated-response";
import { IncomingDocumentAssignmentEntity } from "../../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../../enums/assignment-status.enum";
import { IncomingDocumentAssignmentsRepository } from "../../repository/incoming-document-assignment.repository";
import { IncomingDocumentAssignmentResponse } from "../../types/get-incoming-document-assignment.type";
import { GetIncomingDocumentAssignmentsQuery } from "./get-incoming-document-assignments.query";

@QueryHandler(GetIncomingDocumentAssignmentsQuery)
export class GetIncomingDocumentAssignmentsHandler
  implements IQueryHandler<GetIncomingDocumentAssignmentsQuery>
{
  constructor(
    private readonly assignmentsRepository: IncomingDocumentAssignmentsRepository,
  ) {}

  async execute(
    query: GetIncomingDocumentAssignmentsQuery,
  ): Promise<PaginatedResponse<IncomingDocumentAssignmentResponse>> {
    const { data, nextCursor } =
      await this.assignmentsRepository.findAllByIncomingDocumentId(
        query.incomingDocumentId,
        query.filters,
      );

    return {
      data: data.map((assignment) => this.toResponse(assignment)),
      nextCursor,
    };
  }

  private toResponse(
    assignment: IncomingDocumentAssignmentEntity,
  ): IncomingDocumentAssignmentResponse {
    return {
      id: assignment.id,
      office_type: assignment.office_type,

      division_name: assignment.division?.division_name ?? null,

      notice_of_action: assignment.notice_of_action,
      notice_description: assignment.notice_description,

      assigned_by: assignment.created_by
        ? {
            full_name: assignment.created_by.full_name,
            position: assignment.created_by.position,
          }
        : null,

      created_at: assignment.created_at,
      status: assignment.status,
      action_taken: assignment.action_taken,

      action_taken_by:
        assignment.status === AssignmentStatus.COMPLETE && assignment.action_taken_by
          ? {
              full_name: assignment.action_taken_by.full_name,
              position: assignment.action_taken_by.position,
            }
          : null,

      action_taken_at:
        assignment.status === AssignmentStatus.COMPLETE
          ? assignment.action_taken_at
          : null,
    };
  }
}
