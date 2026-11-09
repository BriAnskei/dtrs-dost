import type { AssignmentSort } from "../dto/get-incoming-document-assignments-dto";
import type { OfficeType } from "../entities/incoming-document-assignment.entity";
import type { AssignmentStatus } from "../enums/assignment-status.enum";
import { AssignmentUserResponse } from "./assignment-user-response";

export interface GetIncomingDocumentAssignmentsFilters {
  limit: number;
  search?: string;
  status?: AssignmentStatus;
  officeType?: OfficeType;
  sort: AssignmentSort;
  cursor?: string;
}

export interface IncomingDocumentAssignmentCursor {
  id: string;
  sort: AssignmentSort;
  sortValue: string;
}

export interface IncomingDocumentAssignmentResponse {
  id: string;
  office_type: OfficeType;
  division_name: string | null;
  notice_of_action: string;
  notice_description: string | null;
  status: AssignmentStatus;
  assigned_by: AssignmentUserResponse | null;
  created_at: Date;
  action_taken: string | null;
  action_taken_by: AssignmentUserResponse | null;
  action_taken_at: Date | null;
}
