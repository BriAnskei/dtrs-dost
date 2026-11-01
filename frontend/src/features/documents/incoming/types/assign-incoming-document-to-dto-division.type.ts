import type { NoticeOfActionDto } from "./notice-of-action-dto";

export interface AssignIncomingDocumentToDivisionDto {
  incomingDocumentId: string;
  divisionId: string;
  noticesOfAction: NoticeOfActionDto[];
}
