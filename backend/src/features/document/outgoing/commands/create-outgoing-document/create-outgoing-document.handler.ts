import { Injectable, Logger } from "@nestjs/common";
import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";
import { OutgoingDocumentCreatedEvent } from "../../../../../common/events/outgoing-document-create.event";
import { buildDocumentKey } from "../../../../../storage/s3/buildDocumentKey";
import { S3Service } from "../../../../../storage/s3/s3.service";
import { DocumentFileService } from "../../../document-file/document-file.service";
import { generateDocumentCode } from "../../../utils/document-code.util";
import { OutgoingDocumentRepository } from "../../repository/outgoing-documents-repository";
import { CreateOutgoingDocumentCommand } from "./create-outgoing-document.command";

@CommandHandler(CreateOutgoingDocumentCommand)
@Injectable()
export class CreateOutgoingDocumentHandler
  implements ICommandHandler<CreateOutgoingDocumentCommand>
{
  private readonly logger = new Logger(CreateOutgoingDocumentHandler.name);

  constructor(
    private readonly repository: OutgoingDocumentRepository,
    private readonly dataSource: DataSource,
    private readonly documentFileService: DocumentFileService,
    private readonly s3Service: S3Service,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateOutgoingDocumentCommand) {
    const { dto, file, uploaderId } = command;

    const objectKey = buildDocumentKey("outgoing");
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
            subject: dto.subject,
            to: dto.to,
            date_prepared: dto.date_prepared,
            date_received: dto.date_received,
            received_by: dto.received_by,
            summary: dto.summary,
          },
          manager,
        );

        const code = generateDocumentCode("outgoing", savedDocument.code_number);
        await this.documentFileService.updateCode(documentFile.id, code, manager);

        return {
          id: savedDocument.id,
          documentFileId: documentFile.id,
          code,
        };
      });

      this.eventBus.publish(
        new OutgoingDocumentCreatedEvent(
          result.id,
          result.documentFileId,
          uploaderId,
          dto.subject,
          dto.to,
        ),
      );

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
