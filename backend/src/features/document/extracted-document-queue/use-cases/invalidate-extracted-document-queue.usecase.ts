import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { S3Service } from "../../../../storage/s3/s3.service";
import { DocumentFileService } from "../../document-file/service/document-file.service";
import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueRepository } from "../repository/extracted-document-queue.repository";
import { InvalidationResponseRepository } from "../repository/invalidation-response.repository";

export interface InvalidateExtractedDocumentQueueInput {
  queueId: string;
  response?: string;
}

@Injectable()
export class InvalidateExtractedDocumentQueueUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly queueRepository: ExtractedDocumentQueueRepository,
    private readonly documentFileService: DocumentFileService,
    private readonly invalidationResponseRepository: InvalidationResponseRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(input: InvalidateExtractedDocumentQueueInput) {
    const result = await this.dataSource.transaction(async (manager) => {
      const queue = await this.queueRepository.findOneForUpdate(input.queueId, manager);

      if (!queue) {
        throw new NotFoundException(
          `Extracted document queue "${input.queueId}" was not found.`,
        );
      }

      if (queue.status !== ExtractedDocumentQueueStatus.PENDING) {
        throw new ConflictException(
          `Cannot invalidate a queue with status "${queue.status}".`,
        );
      }

      const documentFile = await this.documentFileService.findById(
        queue.document_file_id,
        manager,
      );

      await this.queueRepository.updateStatus(
        queue.id,
        ExtractedDocumentQueueStatus.INVALIDATED,
        manager,
      );

      const invalidationResponse = input.response
        ? await this.invalidationResponseRepository.create(
            {
              extracted_document_queue_id: queue.id,
              response: input.response,
            },
            manager,
          )
        : null;

      return {
        id: queue.id,
        objectKey: documentFile.object_key,
        status: ExtractedDocumentQueueStatus.INVALIDATED,
        invalidation_response: invalidationResponse
          ? {
              id: invalidationResponse.id,
              response: invalidationResponse.response,
              created_at: invalidationResponse.created_at,
            }
          : null,
      };
    });

    // after invalidation file is not important here, to aviod having a stale file
    // from s3 (eg. reciever did not delete the invalidated queue), we delete it directy
    // here, though the document_files(DB)  still exist from the record, reciever isn't
    // required to view the file directly when viewing the upload file(my uploaded queue).
    // this is for upload records view module for reciever
    if (result.objectKey) await this.s3Service.delete(result.objectKey);

    return {
      id: result.id,
      status: result.status,
      invalidation_response: result.invalidation_response,
    };
  }
}
