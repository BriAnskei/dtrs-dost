import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";

import { IncomingDocumentStatus } from "../../entities/incoming-document-entity";
import { IncomingDocumentsReadRepository } from "../../repository/incoming-document-repository/incoming-document.read.repository";
import { IncomingDocumentsWriteRepository } from "../../repository/incoming-document-repository/incoming-document.write.repository";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { IncomingDocumentStatusRepository } from "../../repository/incoming-document-status-history.repository";
import { UpdateIncomingDocumentStatusCommand } from "./update-incoming-document-status.command";

@CommandHandler(UpdateIncomingDocumentStatusCommand)
@Injectable()
export class UpdateIncomingDocumentStatusHandler
  implements ICommandHandler<UpdateIncomingDocumentStatusCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly incomingReadRepository: IncomingDocumentsReadRepository,
    private readonly incomingWriteRepository: IncomingDocumentsWriteRepository,
    private readonly statusRepository: IncomingDocumentStatusRepository,
    private readonly routingRepository: IncomingDocumentRoutingRepository,
  ) {}

  async execute(command: UpdateIncomingDocumentStatusCommand): Promise<void> {
    const { incomingDocumentId, statusTo, changedBy, remarks, change_by_division_id } =
      command;

    await this.dataSource.transaction(async (manager) => {
      // If change_by_division_id is provided, the request was initiated by a division user.
      // Validate that the user's assigned division is currently routed to this document.
      await this.validateDivisionRouting(incomingDocumentId, change_by_division_id);

      const incomingDocument = await this.incomingReadRepository.findForUpdate(
        manager,
        incomingDocumentId,
      );

      if (!incomingDocument) {
        throw new NotFoundException("Incoming document not found.");
      }

      const statusFrom = incomingDocument.status;

      const normalizedRemarks = this.validateStatusTransition(
        statusFrom,
        statusTo,
        remarks,
      );

      await this.incomingWriteRepository.update(
        incomingDocumentId,
        { status: statusTo },
        manager,
      );

      await this.statusRepository.createStatusHistory(manager, {
        incoming_document_id: incomingDocumentId,
        status_from: statusFrom,
        status_to: statusTo,
        remarks: normalizedRemarks,
        changed_by: changedBy,
      });
    });
  }

  private async validateDivisionRouting(
    incomingDocumentId: string,
    divisionId: string | null,
  ): Promise<void> {
    if (!divisionId) return;

    const isDivisionRouted = await this.routingRepository.exists(
      incomingDocumentId,
      divisionId,
    );

    if (!isDivisionRouted) {
      throw new ForbiddenException(
        "Your division is not currently routed to this document.",
      );
    }
  }

  private validateStatusTransition(
    statusFrom: IncomingDocumentStatus,
    statusTo: IncomingDocumentStatus,
    remarks?: string | null,
  ): string | null {
    const currentRank = this.getStatusRank(statusFrom);
    const targetRank = this.getStatusRank(statusTo);

    if (statusFrom === statusTo) {
      throw new BadRequestException("The incoming document already has this status.");
    }

    const isRollback = targetRank < currentRank;

    if (!isRollback && targetRank !== currentRank + 1) {
      throw new BadRequestException(
        "Invalid status transition. The document must follow the defined status workflow.",
      );
    }

    const normalizedRemarks = remarks?.trim() || null;

    if (isRollback && !normalizedRemarks) {
      throw new BadRequestException(
        "Remarks are required when rolling back an incoming document status.",
      );
    }

    return normalizedRemarks;
  }

  private getStatusRank(status: IncomingDocumentStatus): number {
    const ranks: Record<IncomingDocumentStatus, number> = {
      [IncomingDocumentStatus.PENDING]: 1,
      [IncomingDocumentStatus.ONGOING]: 2,
      [IncomingDocumentStatus.COMPLETE]: 3,
    };

    const rank = ranks[status];

    if (rank === undefined) {
      throw new BadRequestException("Invalid incoming document status.");
    }

    return rank;
  }
}
