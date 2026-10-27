import { FindOutgoingDocumentsQueryDto } from "../../dto/find-outgoing-documents-query.dto";

export class FindOutgoingDocumentsQuery {
  constructor(public readonly filters: FindOutgoingDocumentsQueryDto) {}
}
