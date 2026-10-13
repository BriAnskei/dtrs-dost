import { OutgoingDocumentSortOrder } from "../enums/outgoing-document-sort-order.enum";

export interface OutgoingDocumentCursor {
  id: string;
  sort: OutgoingDocumentSortOrder;
  sortValue: string | null;
}
