import { NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { IncomingDocumentAssignmentsRepository } from "../../repository/incoming-document-assignment.repository";
import { DeleteIncomingDocumentAssignmentCommand } from "./delete-incoming-document-assignment.command";

@CommandHandler(DeleteIncomingDocumentAssignmentCommand)
export class DeleteIncomingDocumentAssignmentHandler
  implements ICommandHandler<DeleteIncomingDocumentAssignmentCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly assignmentRepository: IncomingDocumentAssignmentsRepository,
    private readonly incomingRepository: IncomingDocumentsRepository,
  ) {}

  async execute(command: DeleteIncomingDocumentAssignmentCommand): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const { incomingDopcumentId, assignmentId } = command;

      const res = await this.assignmentRepository.delete(assignmentId, manager);

      if (!res) throw new NotFoundException("Incoming assginment not found");

      await this.incomingRepository.update(
        incomingDopcumentId,
        { updated_at: new Date() },
        manager,
      );
    });
  }
}
