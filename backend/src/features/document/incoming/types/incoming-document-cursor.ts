import { IncomingDocumentSortOrder } from "../enums/incoming-document-sort-order.enum";

export interface IncomingDocumentCursor {
  id: string;
  sort: IncomingDocumentSortOrder;
  sortValue: string | null;
}
