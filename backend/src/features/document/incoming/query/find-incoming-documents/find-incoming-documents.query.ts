import { FindIncomingDocumentsQueryDto } from "../../dto/find-incoming-documents-query.dto";

export class FindIncomingDocumentsQuery {
  readonly filters: FindIncomingDocumentsQueryDto;

  constructor(filters: FindIncomingDocumentsQueryDto) {
    this.filters = filters;
  }
}
