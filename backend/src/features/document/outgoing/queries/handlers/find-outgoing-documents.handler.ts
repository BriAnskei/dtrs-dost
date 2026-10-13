import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { capitalizeWords } from "../../../../../util/capitalizer";
import { OutgoingDocumentResponseDto } from "../../dto/outgoing-document-response.dto";
import { OutgoingDocumentEntity } from "../../entities/outgoing-document-entity";
import { OutgoingDocumentRepository } from "../../repository/outgoing-documents-repository";
import { FindOutgoingDocumentsQuery } from "./find-outgoing-documents.query";

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

@QueryHandler(FindOutgoingDocumentsQuery)
export class FindOutgoingDocumentsHandler
  implements IQueryHandler<FindOutgoingDocumentsQuery>
{
  constructor(private readonly repository: OutgoingDocumentRepository) {}

  async execute(
    query: FindOutgoingDocumentsQuery,
  ): Promise<PaginatedResponse<OutgoingDocumentResponseDto>> {
    const { data, nextCursor } = await this.repository.findAllWithRelation(query.filters);

    return {
      data: data.map((document) => this.toDto(document)),
      nextCursor,
    };
  }

  private toDto(document: OutgoingDocumentEntity): OutgoingDocumentResponseDto {
    const dto = new OutgoingDocumentResponseDto();

    dto.id = document.id;
    dto.document_file_id = document.document_file_id;
    dto.file_name = document.document_file.file_name;
    dto.object_key = document.document_file.object_key;
    dto.code = document.document_file.code;
    dto.tracking_sequence = document.tracking_sequence;
    dto.subject = document.subject;
    dto.to = document.to;
    dto.summary = document.summary;
    dto.date_prepared = document.date_prepared;
    dto.date_received = document.date_received;
    dto.received_by = document.received_by;
    dto.created_at = document.document_file.created_at;
    dto.uploader_id = document.document_file.uploader_id;
    dto.uploader_name = document.document_file.uploader?.full_name ?? null;

    return dto;
  }
}
