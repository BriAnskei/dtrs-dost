import { AssignmentSort } from "../dto/get-incoming-document-assignments-dto";
import { OfficeType } from "../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../enums/assignment-status.enum";

export interface GetIncomingDocumentAssignmentsFilters {
  status?: AssignmentStatus;
  officeType?: OfficeType;
  sort?: AssignmentSort;
}

export interface AssignmentUserResponse {
  full_name: string;
  position: string | null;
}

export interface IncomingDocumentAssignmentResponse {
  id: string;
  office_type: OfficeType;
  division_name: string | null;
  notice_of_action: string;
  notice_description: string | null;
  assigned_by: AssignmentUserResponse | null;
  created_at: Date;
  action_taken_by: AssignmentUserResponse | null;
  action_taken_at: Date | null;
}
