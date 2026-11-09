import { AssignmentStatus } from "../enums/assignment-status.enum";
import { AssignmentUserResponse } from "../types/assignment-user-response";

export interface RoutedDivisionAssigmentsResponse {
  id: string;
  notice_of_action: string;
  notice_description: string | null;
  created_at: Date;
  created_by: AssignmentUserResponse | null;
  action_taken: string | null;
  action_taken_at: Date | null;
  action_taken_by: AssignmentUserResponse | null;

  status: AssignmentStatus;
}
