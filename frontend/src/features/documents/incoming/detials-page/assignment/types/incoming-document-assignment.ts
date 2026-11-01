import type { AssignmentStatus } from "../../../types/assignment-types";

export type OfficeType = "MAIN" | "DIVISION";

export type AssignmentSort = "newest" | "oldest";

export interface AssignmentUser {
  full_name: string;
  position: string | null;
}

export interface IncomingDocumentAssignment {
  id: string;
  office_type: OfficeType;
  status: AssignmentStatus;
  division_name: string | null;
  notice_of_action: string;
  notice_description: string | null;
  assigned_by: AssignmentUser | null;
  created_at: string;

  action_taken: string | null;
  action_taken_by: AssignmentUser | null;
  action_taken_at: string | null;
}

export interface GetIncomingDocumentAssignmentsParams {
  status?: AssignmentStatus;
  officeType?: OfficeType;
  sort?: AssignmentSort;
}
