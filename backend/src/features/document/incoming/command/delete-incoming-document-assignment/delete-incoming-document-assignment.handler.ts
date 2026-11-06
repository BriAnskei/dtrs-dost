import { ConflictException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource, EntityManager } from "typeorm";
import {
  IncomingDocumentAssignmentEntity,
  OfficeType,
} from "../../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../../enums/assignment-status.enum";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { IncomingDocumentAssignmentsRepository } from "../../repository/incoming-document-assignment.repository";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { AssignmentCounterService } from "../../services/assignment-counter.service";
import { DeleteIncomingDocumentAssignmentCommand } from "./delete-incoming-document-assignment.command";

@CommandHandler(DeleteIncomingDocumentAssignmentCommand)
export class DeleteIncomingDocumentAssignmentHandler
  implements ICommandHandler<DeleteIncomingDocumentAssignmentCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly assignmentRepository: IncomingDocumentAssignmentsRepository,
    private readonly routingRepository: IncomingDocumentRoutingRepository,
    private readonly incomingRepository: IncomingDocumentsRepository,
    private readonly counterService: AssignmentCounterService,
  ) {}

  async execute(command: DeleteIncomingDocumentAssignmentCommand): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const { incomingDocumentId, assignmentId } = command;

      const assignment = await this.findAssignment(
        assignmentId,
        incomingDocumentId,
        manager,
      );

      this.validateAssignment(assignment);

      const routingId = await this.findRoutingId(assignment, manager);

      await this.assignmentRepository.delete(assignmentId, manager);

      await this.adjustCounters(
        incomingDocumentId,
        routingId,
        assignment.status,
        manager,
      );

      await this.updateIncomingDocument(incomingDocumentId, manager);
    });
  }

  private async findAssignment(
    assignmentId: string,
    incomingDocumentId: string,
    manager: EntityManager,
  ): Promise<IncomingDocumentAssignmentEntity> {
    const assignment = await this.assignmentRepository.findForUpdate(
      assignmentId,
      manager,
    );

    if (!assignment || assignment.incoming_document_id !== incomingDocumentId) {
      throw new NotFoundException("Assignment does not exist.");
    }

    return assignment;
  }

  private validateAssignment(assignment: IncomingDocumentAssignmentEntity): void {
    if (assignment.status === AssignmentStatus.COMPLETE) {
      throw new ConflictException("Completed assignments cannot be deleted.");
    }
  }

  private async findRoutingId(
    assignment: IncomingDocumentAssignmentEntity,
    manager: EntityManager,
  ): Promise<string | null> {
    if (assignment.office_type !== OfficeType.DIVISION || !assignment.division_id) {
      return null;
    }

    const routing = await this.routingRepository.findByIncomingDocumentAndDivision(
      assignment.incoming_document_id,
      assignment.division_id,
      manager,
    );

    return routing?.id ?? null;
  }

  private async adjustCounters(
    incomingDocumentId: string,
    routingId: string | null,
    status: AssignmentStatus,
    manager: EntityManager,
  ): Promise<void> {
    const changes = {
      total: -1,
      ...(status === AssignmentStatus.ONGOING && { ongoing: -1 }),
    };

    if (routingId) {
      await this.counterService.adjustIncomingRoutingtCounts(routingId, changes, manager);
    }

    await this.counterService.adjustIncomingGlobalCounts(
      incomingDocumentId,
      changes,
      manager,
    );
  }

  private async updateIncomingDocument(
    incomingDocumentId: string,
    manager: EntityManager,
  ): Promise<void> {
    await this.incomingRepository.update(
      incomingDocumentId,
      { updated_at: new Date() },
      manager,
    );
  }
}
