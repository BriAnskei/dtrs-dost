import { FindDivisionIncomingDocumentsQueryDto } from "../../dto/find-division-incoming-documents-query.dto";

export class FindDivisionIncomingDocumentsQuery {
  constructor(
    public readonly division_id: string | null,
    public readonly filters: FindDivisionIncomingDocumentsQueryDto,
  ) {}
}
