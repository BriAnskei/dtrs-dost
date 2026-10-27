import { AssignIncomingDocumentToDivisionDto } from "../../dto/assign-incoming-document-to-division";

export class AssignIncomingDocumentToDivisionCommand {
  constructor(
    public readonly dto: AssignIncomingDocumentToDivisionDto,
    public readonly createdById: string,
  ) {}
}
