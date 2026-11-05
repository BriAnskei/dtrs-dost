import { NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";
import { OfficeType } from "../../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../../enums/assignment-status.enum";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { IncomingDocumentAssignmentsRepository } from "../../repository/incoming-document-assignment.repository";
import { AssignmentCounterService } from "../../services/assignment-counter.service";
import { DeleteIncomingDocumentAssignmentCommand } from "./delete-incoming-document-assignment.command";

@CommandHandler(DeleteIncomingDocumentAssignmentCommand)
export class DeleteIncomingDocumentAssignmentHandler
  implements ICommandHandler<DeleteIncomingDocumentAssignmentCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly assignmentRepository: IncomingDocumentAssignmentsRepository,
    private readonly incomingRepository: IncomingDocumentsRepository,
    private readonly counterService: AssignmentCounterService,
  ) {}

  async execute(command: DeleteIncomingDocumentAssignmentCommand): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const { incomingDopcumentId, assignmentId } = command;

      const assignmentWithRoutingId = await this.assignmentRepository.findByIdWithRouting(
        assignmentId,
        manager,
      );

      if (!assignmentWithRoutingId)
        throw new NotFoundException("Assinment does not exist");
      const { assignment, routingId } = assignmentWithRoutingId;

      await this.assignmentRepository.delete(assignmentId, manager);

      const changes = {
        total: -1,
        ...(assignment.status === AssignmentStatus.ONGOING && { ongoing: -1 }),
      };

      if (assignment.office_type === OfficeType.DIVISION && routingId) {
        await this.counterService.adjustIncomingRoutingtCounts(
          routingId,
          changes,
          manager,
        );
      }

      await this.counterService.adjustIncomingGlobalCounts(
        incomingDopcumentId,
        changes,
        manager,
      );

      await this.incomingRepository.update(
        incomingDopcumentId,
        { updated_at: new Date() },
        manager,
      );
    });
  }
}
