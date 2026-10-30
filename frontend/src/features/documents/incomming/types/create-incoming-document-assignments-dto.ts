import type { OfficeType } from "../enum/office-type.enum";
import type { NoticeOfActionDto } from "./notice-of-action-dto";

export interface CreateIncomingDocumentAssignmentsDto {
  officeType: OfficeType;
  incomingDocumentRoutingId?: string;
  noticesOfActions: NoticeOfActionDto[];
}
