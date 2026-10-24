import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { S3Service } from "../../../../storage/s3/s3.service";
import { DocumentFileService } from "../../document-file/service/document-file.service";
import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";

@Injectable()
export class DeleteExtractedDocumentQueueUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly extractedDocumentQueueService: ExtractedDocumentQueueService,
    private readonly documentFileService: DocumentFileService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(queueId: string): Promise<void> {
    try {
      const queue = await this.extractedDocumentQueueService.getOrThrow(queueId);

      const res = await this.dataSource.transaction(async (manager) => {
        let deleteFileRequired = false;

        await this.extractedDocumentQueueService.delete(queue.id, manager);

        if (
          queue.status === ExtractedDocumentQueueStatus.PENDING ||
          queue.status === ExtractedDocumentQueueStatus.INVALIDATED
        ) {
          await this.documentFileService.delete(queue.document_file_id, manager);
          deleteFileRequired = true;
        }

        return { deleteFileRequired };
      });

      if (res.deleteFileRequired)
        await this.s3Service.delete(queue.document_file.object_key);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
