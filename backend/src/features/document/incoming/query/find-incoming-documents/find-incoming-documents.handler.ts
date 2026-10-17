import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { IncomingDocumentResponseDto } from "../../dto/incoming-document-response.dto";
import { IncomingDocumentEntity } from "../../entities/incoming-document-entity";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { FindIncomingDocumentsQuery } from "./find-incoming-documents.query";

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

@QueryHandler(FindIncomingDocumentsQuery)
export class FindIncomingDocumentsHandler
  implements IQueryHandler<FindIncomingDocumentsQuery>
{
  constructor(private readonly repository: IncomingDocumentsRepository) {}

  async execute(
    query: FindIncomingDocumentsQuery,
  ): Promise<PaginatedResponse<IncomingDocumentResponseDto>> {
    const { data, nextCursor } = await this.repository.findAllWithRelation(query.filters);

    return {
      data: data.map((document) => this.toDto(document)),
      nextCursor,
    };
  }

  private toDto(document: IncomingDocumentEntity): IncomingDocumentResponseDto {
    const dto = new IncomingDocumentResponseDto();

    dto.id = document.id;
    dto.document_file_id = document.document_file_id;

    dto.file_name = document.document_file.file_name;
    dto.object_key = document.document_file.object_key;
    dto.code = document.document_file.code;

    dto.tracking_sequence = document.tracking_sequence;

    dto.subject = document.subject;
    dto.document_from = document.document_from;
    dto.recipient = document.recipient;
    dto.date_received = document.date_received;

    dto.status = document.status;
    dto.summary = document.summary;

    dto.updated_at = document.updated_at;
    dto.created_at = document.document_file.created_at;

    dto.uploader_id = document.document_file.uploader_id;
    dto.uploader_name = document.document_file.uploader?.full_name ?? null;

    return dto;
  }
}
