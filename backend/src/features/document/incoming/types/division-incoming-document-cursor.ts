import { DivisionIncomingDocumentSortOrder } from "../enums/division-incoming-document-sort-order.enum";

export interface DivisionIncomingDocumentCursor {
  id: string;
  divisionId: string;
  sort: DivisionIncomingDocumentSortOrder;
  routedAt: string;
}
