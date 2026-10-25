import { Readable } from "node:stream";
import { Injectable } from "@nestjs/common";
import { FileStreamResponse } from "../../../../common/file-stream/document-file-stream.type";
import { S3Service } from "../../../../storage/s3/s3.service";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";

@Injectable()
export class GetDocumentFileStreamUseCase {
  constructor(
    private readonly extractedDocumentQueueService: ExtractedDocumentQueueService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(id: string): Promise<FileStreamResponse> {
    const extractedQueue = await this.extractedDocumentQueueService.getOrThrow(id);
    const object = await this.s3Service.get(extractedQueue.document_file.object_key);

    if (!(object.Body instanceof Readable)) {
      throw new Error("The stored document could not be read as a stream.");
    }

    return {
      stream: object.Body as Readable,
      filename: extractedQueue.document_file.file_name,
    };
  }
}
