/** A user reference on an assignment. `position` is optional on the user entity. */
export interface AssignmentUser {
  name: string;
  position: string | null;
}

export type Status = "PENDING" | "ONGOING" | "COMPLETE";

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

  status: Status;
}
