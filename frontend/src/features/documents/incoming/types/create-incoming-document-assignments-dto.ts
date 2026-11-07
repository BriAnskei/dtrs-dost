import type { OfficeTypeEnum } from "../enum/office-type.enum";
import type { NoticeOfActionDto } from "./notice-of-action-dto";

export interface CreateIncomingDocumentAssignmentsDto {
  officeType: OfficeTypeEnum;
  incomingDocumentRoutingId?: string;
  noticesOfActions: NoticeOfActionDto[];
}
