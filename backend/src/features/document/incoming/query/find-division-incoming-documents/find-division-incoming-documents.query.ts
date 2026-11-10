import { FindDivisionIncomingDocumentsQueryDto } from "./find-division-incoming-documents.dto";

export class FindDivisionIncomingDocumentsQuery {
  constructor(
    public readonly divisionId: string,
    public readonly filters: FindDivisionIncomingDocumentsQueryDto,
  ) {}
}
