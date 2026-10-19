import { Readable } from "node:stream";
import { Injectable } from "@nestjs/common";
import { S3Service } from "../../../../storage/s3/s3.service";
import { ExtractedDocumentQueueService } from "../../extracted-document-queue/service/extracted-document-queue.service";
import { DocumentFileService } from "../service/document-file.service";

@Injectable()
export class GetDocumentFileUseCase {
  constructor(
    private readonly documentFileService: DocumentFileService,
    private readonly extractedDocumentQueueService: ExtractedDocumentQueueService,
    private readonly s3Service: S3Service,
  ) {}

  async getFileStream(id: string) {
    const extractedQueue = await this.extractedDocumentQueueService.getOrThrow(id);
    const documentFile = await this.documentFileService.findById(
      extractedQueue.document_file_id,
    );

    const object = await this.s3Service.get(documentFile.object_key);

    return {
      stream: object.Body as Readable,
      filename: documentFile.file_name,
    };
  }
}
