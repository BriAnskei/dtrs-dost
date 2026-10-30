import { ConflictException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource, QueryFailedError } from "typeorm";
import { DivisionService } from "../../../../user/service/division.service";
import { IncomingDocumentAssignmentEntity, OfficeType } from "../../entities/incoming-document-assignment.entity";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { IncomingDocumentAssignmentsRepository } from "../../repository/incoming-document-assignment.repository";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { AssignIncomingDocumentToDivisionCommand } from "./assign-incoming-document-to-division.command";

@CommandHandler(AssignIncomingDocumentToDivisionCommand)
export class AssignIncomingDocumentToDivisionHandler
  implements ICommandHandler<AssignIncomingDocumentToDivisionCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly incomingRepository: IncomingDocumentsRepository,
    private readonly routingRepository: IncomingDocumentRoutingRepository,
    private readonly assignmentsRepository: IncomingDocumentAssignmentsRepository,

    private readonly divisionService: DivisionService,
  ) {}

  async execute(command: AssignIncomingDocumentToDivisionCommand) {
    const { dto, createdById } = command;

    const noticesOfAction = dto.noticesOfAction ?? [];

    try {
      return await this.dataSource.transaction(async (manager) => {
        const incomingDocument = await this.incomingRepository.findById(
          dto.incomingDocumentId,
        );

        if (!incomingDocument) {
          throw new NotFoundException("Incoming document not found.");
        }

        // fetches the division on business level, throws NotFound if division does not exist
        await this.divisionService.findById(dto.divisionId);

        const isRoutingExist = await this.routingRepository.exists(
          dto.incomingDocumentId,
          dto.divisionId,
          manager,
        );

        if (isRoutingExist) {
          throw new ConflictException("This Division is already routed to this document");
        }

        await this.routingRepository.create(
          {
            incoming_document_id: dto.incomingDocumentId,
            division_id: dto.divisionId,
          },
          manager,
        );

        const assignments: Partial<IncomingDocumentAssignmentEntity>[] =
          noticesOfAction.map((notice) => ({
            incoming_document_id: dto.incomingDocumentId,
            division_id: dto.divisionId,
            office_type: OfficeType.DIVISION,
            notice_of_action: notice.noticeOfAction.trim(),
            notice_description: notice.noticeDescription?.trim() || null,
            created_by_id: createdById,
          }));

        await this.assignmentsRepository.insertMany(assignments, manager);

        await this.incomingRepository.update(
          dto.incomingDocumentId,
          { updated_at: new Date() },
          manager,
        );
      });
    } catch (error) {
      // concurrent request with the same division id that is passedd will show an error constraint,
      // thus it shoul return a conflict exception
      if (
        error instanceof QueryFailedError &&
        (
          error as QueryFailedError & {
            driverError?: {
              code?: string;
              constraint?: string;
            };
          }
        ).driverError?.code === "23505" &&
        (
          error as QueryFailedError & {
            driverError?: {
              code?: string;
              constraint?: string;
            };
          }
        ).driverError?.constraint === "uq_incoming_document_routing"
      ) {
        throw new ConflictException(
          "This incoming document is already routed to this division.",
        );
      }

      throw error;
    }
  }
}
