import { Injectable, Logger } from "@nestjs/common";
import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";
import { IncomingDocumentCreatedEvent } from "../../../../../common/events/incoming-document-created.event";
import { buildDocumentKey } from "../../../../../storage/s3/buildDocumentKey";
import { S3Service } from "../../../../../storage/s3/s3.service";
import { capitalizeWords } from "../../../../../util/capitalizer";
import { DocumentFileService } from "../../../document-file/document-file.service";
import { generateDocumentCode } from "../../../utils/document-code.util";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { CreateIncomingDocumentCommand } from "./create-incoming-document.command";

@CommandHandler(CreateIncomingDocumentCommand)
@Injectable()
export class CreateIncomingDocumentHandler
  implements ICommandHandler<CreateIncomingDocumentCommand>
{
  private readonly logger = new Logger(CreateIncomingDocumentHandler.name);

  constructor(
    private readonly repository: IncomingDocumentsRepository,
    private readonly dataSource: DataSource,
    private readonly documentFileService: DocumentFileService,
    private readonly s3Service: S3Service,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateIncomingDocumentCommand) {
    const { dto, file, uploaderId } = command;

    const objectKey = buildDocumentKey("incoming");
    let uploadCompleted = false;

    try {
      await this.s3Service.upload(objectKey, file.buffer, file.mimetype);

      uploadCompleted = true;

      const result = await this.dataSource.transaction(async (manager) => {
        const documentFile = await this.documentFileService.create(
          {
            file_name: file.originalname,
            object_key: objectKey,
            uploader_id: uploaderId,
          },
          manager,
        );

        const savedDocument = await this.repository.create(
          {
            document_file_id: documentFile.id,
            subject: capitalizeWords(dto.subject),
            document_from: capitalizeWords(dto.document_from),
            recipient: capitalizeWords(dto.recipient),
            date_received: dto.date_received,
            summary: dto.summary,
          },
          manager,
        );

        const code = generateDocumentCode("incoming", savedDocument.tracking_sequence);
        await this.documentFileService.updateCode(documentFile.id, code, manager);

        return {
          id: savedDocument.id,
          documentFileId: documentFile.id,
          code,
        };
      });

      // this.eventBus.publish(
      //   new IncomingDocumentCreatedEvent(
      //     result.id,
      //     result.documentFileId,
      //     uploaderId,
      //     result.subject,
      //     result.document_from,
      //     result.recipient,
      //   ),
      // );

      return result;
    } catch (error) {
      if (uploadCompleted) {
        try {
          await this.s3Service.delete(objectKey);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to clean up S3 object ${objectKey}. ` +
              "Manual or scheduled cleanup may be required.",
            cleanupError instanceof Error ? cleanupError.stack : String(cleanupError),
          );
        }
      }

      throw error;
    }
  }
}
