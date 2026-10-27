import { Injectable } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";
import { capitalizeWords } from "../../../../../util/capitalizer";
import { DocumentFileService } from "../../../document-file/service/document-file.service";
import { ExtractedDocumentQueueService } from "../../../extracted-document-queue/service/extracted-document-queue.service";
import { generateDocumentCode } from "../../../utils/document-code.util";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { CreateIncomingFromQueueCommand } from "./ create-incoming-from-queue.command";

@CommandHandler(CreateIncomingFromQueueCommand)
@Injectable()
export class CreateIncomingFromQueueHandler
  implements ICommandHandler<CreateIncomingFromQueueCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly extractedDocumentQueueService: ExtractedDocumentQueueService,
    private readonly incomingDocumentsRepository: IncomingDocumentsRepository,
    private readonly documentFileService: DocumentFileService,
  ) {}

  async execute(command: CreateIncomingFromQueueCommand) {
    const { queueId, dto } = command;

    return this.dataSource.transaction(async (manager) => {
      const queue = await this.extractedDocumentQueueService.approveIfPending(
        queueId,
        manager,
      );

      const documentFileId = queue.document_file_id;

      const savedDocument = await this.incomingDocumentsRepository.create(
        {
          document_file_id: documentFileId,
          subject: capitalizeWords(dto.subject),
          document_from: capitalizeWords(dto.document_from),
          recipient: capitalizeWords(dto.recipient),
          date_received: dto.date_received,
          summary: dto.summary,
        },
        manager,
      );

      const code = generateDocumentCode("incoming", savedDocument.tracking_sequence);
      await this.documentFileService.updateCode(documentFileId, code, manager);

      return {
        id: savedDocument.id,
        documentFileId,
        code,
      };
    });
  }
}
