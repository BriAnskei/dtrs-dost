import { FindDivisionIncomingDocumentsQueryDto } from "../../dto/find-division-incoming-documents-query.dto";

export class FindDivisionIncomingDocumentsQuery {
  constructor(
    public readonly userId: string,
    public readonly filters: FindDivisionIncomingDocumentsQueryDto,
  ) {}
}
