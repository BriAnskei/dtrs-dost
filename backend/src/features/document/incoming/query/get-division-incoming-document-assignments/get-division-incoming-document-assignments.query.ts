import { GetDivisionIncomingDocumentAssignmentsDto } from "../../dto/get-division-incoming-document-assignments.dto";

export class GetDivisionIncomingDocumentAssignmentsQuery {
  constructor(
    public readonly divisionId: string | null,
    public readonly filters: GetDivisionIncomingDocumentAssignmentsDto,
  ) {}
}
