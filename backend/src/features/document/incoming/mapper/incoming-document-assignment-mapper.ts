import { IncomingDocumentAssignmentEntity } from "../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../enums/assignment-status.enum";
import { IncomingDocumentAssignmentResponse } from "../types/get-incoming-document-assignment.type";

export function toIncomingDocumentAssignmentResponse(
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
      assignment.status === AssignmentStatus.COMPLETE ? assignment.action_taken_at : null,
  };
}
