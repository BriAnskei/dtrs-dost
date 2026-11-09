import type { AssignmentUser } from "../shared/types/assignment-user-types";
import type { AssignmentStatus } from "./assignment-types";

export interface RoutedDivisionAssignment {
  id: string;
  notice_of_action: string;
  notice_description: string | null;
  created_at: string;

  /** `null` when the creating user was removed. */
  created_by: AssignmentUser | null;

  action_taken: string | null;
  action_taken_at: string | null;

  /** `null` until an action is taken, or when that user was removed. */
  action_taken_by: AssignmentUser | null;

  status: AssignmentStatus;
}
