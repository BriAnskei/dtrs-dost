import { ICommand } from "@nestjs/cqrs";
import { CompleteIncomingDocumentAssignmentDto } from "../../dto/complete-incoming-document-assignment-dto";

export class CompleteIncomingDocumentAssignmentCommand implements ICommand {
  constructor(
    public readonly assignmentId: string,
    public readonly userId: string,
    public readonly userRole: number,
    public readonly dto: CompleteIncomingDocumentAssignmentDto,
  ) {}
}
