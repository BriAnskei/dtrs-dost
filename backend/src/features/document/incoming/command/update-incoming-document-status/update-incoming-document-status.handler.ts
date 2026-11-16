import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";

import { IncomingDocumentStatus } from "../../entities/incoming-document-entity";
import { IncomingDocumentsReadRepository } from "../../repository/incoming-document-repository/incoming-document.read.repository";
import { IncomingDocumentsWriteRepository } from "../../repository/incoming-document-repository/incoming-document.write.repository";
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
    private readonly statusWriteRepository: IncomingDocumentStatusRepository,
  ) {}

  async execute(command: UpdateIncomingDocumentStatusCommand): Promise<void> {
    const { incomingDocumentId, statusTo, changedBy, remarks } = command;

    return this.dataSource.transaction(async (manager) => {
      const incomingDocument = await this.incomingReadRepository.findForUpdate(
        manager,
        incomingDocumentId,
      );

      if (!incomingDocument) {
        throw new NotFoundException("Incoming document not found.");
      }

      const statusFrom = incomingDocument.status;

      if (statusFrom === statusTo) {
        throw new BadRequestException("The incoming document already has this status.");
      }

      const currentRank = this.getStatusRank(statusFrom);
      const targetRank = this.getStatusRank(statusTo);

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

      await this.incomingWriteRepository.update(
        incomingDocumentId,
        { status: statusTo },
        manager,
      );

      await this.statusWriteRepository.createStatusHistory(manager, {
        incoming_document_id: incomingDocumentId,
        status_from: statusFrom,
        status_to: statusTo,
        remarks: normalizedRemarks,
        changed_by: changedBy,
      });
    });
  }

  private getStatusRank(status: IncomingDocumentStatus): number {
    switch (status) {
      case IncomingDocumentStatus.PENDING:
        return 1;

      case IncomingDocumentStatus.ONGOING:
        return 2;

      case IncomingDocumentStatus.COMPLETE:
        return 3;

      default:
        throw new BadRequestException("Invalid incoming document status.");
    }
  }
}
