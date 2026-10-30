import { CreateIncomingDocumentAssignmentsDto } from "../../dto/create-incoming-document-assignments-dto";

export class CreateIncomingDocumentAssignmentsCommand {
  constructor(
    public readonly incomingDocumentId: string,
    public readonly dto: CreateIncomingDocumentAssignmentsDto,
    public readonly createdById: string,
  ) {}
}
