import { AssignmentStatus } from "../enums/assignment-status.enum";

export interface RoutedDivisionAssigmentsResponse {
  id: string;
  notice_of_action: string;
  notice_description: string | null;
  created_at: Date;
  created_by: {
    name: string;
    position: string | null;
  } | null;
  action_taken: string | null;
  action_taken_at: Date | null;
  action_taken_by: {
    name: string;
    position: string | null;
  } | null;

  status: AssignmentStatus;
}
