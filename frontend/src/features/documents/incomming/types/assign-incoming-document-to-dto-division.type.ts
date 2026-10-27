export interface DivisionNoticeOfAction {
  noticeOfAction: string;
  noticeDescription?: string | null;
}

export interface AssignIncomingDocumentToDivisionDto {
  incomingDocumentId: string;
  divisionId: string;
  noticesOfAction: DivisionNoticeOfAction[];
}
