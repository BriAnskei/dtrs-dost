import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource, EntityManager } from "typeorm";
import {
  IncomingDocumentAssignmentEntity,
  OfficeType,
} from "../../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../../enums/assignment-status.enum";
import { IncomingDocumentAssignmentsWriteRepository } from "../../repository/incoming-document-assignment-repository/incoming-document-assignment.write.repository";
import { IncomingDocumentsReadRepository } from "../../repository/incoming-document-repository/incoming-document.read.repository";
import { IncomingDocumentsWriteRepository } from "../../repository/incoming-document-repository/incoming-document.write.repository";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { AssignmentCounterService } from "../../services/assignment-counter.service";
import { CreateIncomingDocumentAssignmentsCommand } from "./create-incoming-document-assigments.command";

@CommandHandler(CreateIncomingDocumentAssignmentsCommand)
export class CreateIncomingDocumentAssignmentsHandler
  implements ICommandHandler<CreateIncomingDocumentAssignmentsCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly incomingReadRepository: IncomingDocumentsReadRepository,
    private readonly incomingWriteRepository: IncomingDocumentsWriteRepository,
    private readonly routingRepository: IncomingDocumentRoutingRepository,
    private readonly assignmentWriteRepository: IncomingDocumentAssignmentsWriteRepository,
    private readonly counterService: AssignmentCounterService,
  ) {}

  async execute(command: CreateIncomingDocumentAssignmentsCommand): Promise<void> {
    const { incomingDocumentId, dto, createdById } = command;

    return this.dataSource.transaction(async (manager) => {
      await this.validateIncomingDocument(incomingDocumentId, manager);

      const context = await this.resolveAssignmentContext(
        incomingDocumentId,
        dto.officeType,
        dto.incomingDocumentRoutingId,
        manager,
      );

      const assignments = this.buildAssignments(
        incomingDocumentId,
        createdById,
        dto.officeType,
        dto.noticesOfActions,
        context,
      );

      await this.assignmentWriteRepository.insertMany(assignments, manager);

      await this.adjustCounters(
        incomingDocumentId,
        context.routingId,
        assignments.length,
        manager,
      );

      await this.updateIncomingDocument(incomingDocumentId, manager);
    });
  }

  private async validateIncomingDocument(
    incomingDocumentId: string,
    manager: EntityManager,
  ): Promise<void> {
    const incomingDocument = await this.incomingReadRepository.findById(
      incomingDocumentId,
      manager,
    );

    if (!incomingDocument) {
      throw new NotFoundException("Incoming document not found.");
    }
  }

  private async resolveAssignmentContext(
    incomingDocumentId: string,
    officeType: OfficeType,
    routingId: string | undefined,
    manager: EntityManager,
  ): Promise<{
    divisionId: string | null;
    routingId: string | null;
    status: AssignmentStatus;
  }> {
    if (officeType === OfficeType.MAIN) {
      return {
        divisionId: null,
        routingId: null,
        status: AssignmentStatus.ONGOING,
      };
    }

    if (!routingId) {
      throw new BadRequestException("Routing ID is required for division assignments.");
    }

    const routing = await this.routingRepository.findByIdForUpdate(routingId, manager);

    if (!routing || routing.incoming_document_id !== incomingDocumentId) {
      throw new NotFoundException("Incoming document routing not found.");
    }

    return {
      divisionId: routing.division_id,
      routingId: routing.id,
      status: AssignmentStatus.PENDING,
    };
  }

  private buildAssignments(
    incomingDocumentId: string,
    createdById: string,
    officeType: OfficeType,
    notices: CreateIncomingDocumentAssignmentsCommand["dto"]["noticesOfActions"],
    context: {
      divisionId: string | null;
      routingId: string | null;
      status: AssignmentStatus;
    },
  ): Partial<IncomingDocumentAssignmentEntity>[] {
    return notices.map((notice) => ({
      incoming_document_id: incomingDocumentId,
      division_id: context.divisionId,
      office_type: officeType,
      notice_of_action: notice.noticeOfAction.trim(),
      notice_description: notice.noticeDescription?.trim() || null,
      created_by_id: createdById,
      status: context.status,
    }));
  }

  private async adjustCounters(
    incomingDocumentId: string,
    routingId: string | null,
    assignmentCount: number,
    manager: EntityManager,
  ): Promise<void> {
    if (assignmentCount === 0) return;

    const changes = { total: assignmentCount };

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
    await this.incomingWriteRepository.update(
      incomingDocumentId,
      { updated_at: new Date() },
      manager,
    );
  }
}
