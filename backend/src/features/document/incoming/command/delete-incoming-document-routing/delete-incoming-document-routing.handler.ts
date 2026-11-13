import { ConflictException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";
import { AssignmentStatus } from "../../enums/assignment-status.enum";
import { IncomingDocumentAssignmentsReadRepository } from "../../repository/incoming-document-assignment-repository/incoming-document-assignment.read.repository";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { DeleteIncomingDocumentRoutingCommand } from "./delete-incoming-document-routing.command";

@CommandHandler(DeleteIncomingDocumentRoutingCommand)
export class DeleteIncomingDocumentRoutingHandler
  implements ICommandHandler<DeleteIncomingDocumentRoutingCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly routingRepository: IncomingDocumentRoutingRepository,
    private readonly assignmentReadRepository: IncomingDocumentAssignmentsReadRepository,
  ) {}

  async execute(command: DeleteIncomingDocumentRoutingCommand): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const routing = await this.routingRepository.findByIdForUpdate(
        command.routingId,
        manager,
      );

      if (!routing) {
        throw new NotFoundException("Incoming document routing not found.");
      }

      const hasIncompleteAssignments =
        await this.assignmentReadRepository.existsByStatuses(
          routing.incoming_document_id,
          routing.division_id,
          [AssignmentStatus.PENDING, AssignmentStatus.ONGOING],
          manager,
        );

      if (hasIncompleteAssignments) {
        throw new ConflictException(
          "Cannot unroute this division because it still has pending or ongoing assignments.",
        );
      }

      await this.routingRepository.delete(command.routingId, manager);
    });
  }
}
