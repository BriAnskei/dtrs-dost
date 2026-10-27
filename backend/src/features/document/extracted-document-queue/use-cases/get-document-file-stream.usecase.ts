import { Readable } from "node:stream";
import { Injectable } from "@nestjs/common";
import { S3Service } from "../../../../storage/s3/s3.service";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";

@Injectable()
export class GetDocumentFileStreamUseCase {
  constructor(
    private readonly extractedDocumentQueueService: ExtractedDocumentQueueService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(id: string) {
    const extractedQueue = await this.extractedDocumentQueueService.getOrThrow(id);
    const object = await this.s3Service.get(extractedQueue.document_file.object_key);

    return {
      stream: object.Body as Readable,
      filename: extractedQueue.document_file.file_name,
    };
  }
}
