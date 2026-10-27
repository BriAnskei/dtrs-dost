import { Readable } from "node:stream";
import { NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { FileStreamResponse } from "../../../../../common/file-stream/document-file-stream.type";
import { S3Service } from "../../../../../storage/s3/s3.service";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { GetIncomingDocumentFileStreamQuery } from "./get-incoming-document-file-stream.query";

@QueryHandler(GetIncomingDocumentFileStreamQuery)
export class GetIncomingDocumentFileStreamHandler
  implements IQueryHandler<GetIncomingDocumentFileStreamQuery, FileStreamResponse>
{
  constructor(
    private readonly incomingRepository: IncomingDocumentsRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(query: GetIncomingDocumentFileStreamQuery): Promise<FileStreamResponse> {
    const incoming = await this.incomingRepository.findByIdWithFile(query.id);

    if (!incoming) throw new NotFoundException("Cannot find data");

    if (!incoming.document_file) throw new NotFoundException("Cannot find file");

    const document_file = incoming.document_file;

    const object = await this.s3Service.get(document_file.object_key);

    if (!(object.Body instanceof Readable)) {
      throw new Error("The stored document could not be read as a stream.");
    }

    return {
      stream: object.Body as Readable,
      filename: document_file.file_name,
    };
  }
}
