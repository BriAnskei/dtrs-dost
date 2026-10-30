import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";
import {
  IncomingDocumentAssignmentEntity,
  OfficeType,
} from "../../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../../enums/assignment-status.enum";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { IncomingDocumentAssignmentsRepository } from "../../repository/incoming-document-assignment.repository";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { CreateIncomingDocumentAssignmentsCommand } from "./create-incoming-document-assigments.command";

@CommandHandler(CreateIncomingDocumentAssignmentsCommand)
export class CreateIncomingDocumentAssignmentsHandler
  implements ICommandHandler<CreateIncomingDocumentAssignmentsCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly incomingRepository: IncomingDocumentsRepository,
    private readonly routingRepository: IncomingDocumentRoutingRepository,
    private readonly assignmentsRepository: IncomingDocumentAssignmentsRepository,
  ) {}

  async execute(command: CreateIncomingDocumentAssignmentsCommand) {
    const { incomingDocumentId, dto, createdById } = command;

    return this.dataSource.transaction(async (manager) => {
      const incomingDocument = await this.incomingRepository.findById(incomingDocumentId);

      if (!incomingDocument) {
        throw new NotFoundException("Incoming document not found.");
      }

      let divisionId: string | null = null;
      let status = AssignmentStatus.ONGOING;

      if (dto.officeType === OfficeType.DIVISION) {
        if (!dto.incomingDocumentRoutingId)
          throw new BadRequestException("routing id is rquired in division type");

        const routing = await this.routingRepository.findById(
          dto.incomingDocumentRoutingId,
          manager,
        );

        if (!routing || routing.incoming_document_id !== incomingDocumentId) {
          throw new NotFoundException("Incoming document routing not found.");
        }

        divisionId = routing.division_id;
        status = AssignmentStatus.PENDING;
      }

      const assignments: Partial<IncomingDocumentAssignmentEntity>[] =
        dto.noticesOfActions.map((notice) => ({
          incoming_document_id: incomingDocumentId,
          division_id: divisionId,
          office_type: dto.officeType,
          notice_of_action: notice.noticeOfAction.trim(),
          notice_description: notice.noticeDescription?.trim() || null,
          created_by_id: createdById,
          status,
        }));

      await this.assignmentsRepository.insertMany(assignments, manager);

      await this.incomingRepository.update(
        incomingDocumentId,
        { updated_at: new Date() },
        manager,
      );
    });
  }
}
