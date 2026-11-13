import type { AssignmentSort } from "../../../detials-page/assignment/types/incoming-document-assignment";
import type { AssignmentStatus } from "../../../types/assignment-types";

export interface GetDivisionIncomingDocumentAssignmentsParams {
  limit?: number;
  search?: string;
  status?: AssignmentStatus;
  sort?: AssignmentSort;
}
