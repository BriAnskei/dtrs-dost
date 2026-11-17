import { FindIncomingDocumentStatusHistoriesQueryDto } from "../../dto/find-incoming-document-status-histories-query.dto";

export class FindIncomingDocumentStatusHistoriesQuery {
  constructor(
    public readonly incomingDocumentId: string,
    public readonly filters: FindIncomingDocumentStatusHistoriesQueryDto,
  ) {}
}
