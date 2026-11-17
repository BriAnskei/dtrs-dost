import { Injectable } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";

import { PaginatedResponse } from "../../../../../common/pagination/paginated-response";
import { IncomingDocumentStatusHistoryResponseDto } from "../../dto/find-incoming-document-status-response.dto";
import { IncomingDocumentStatusHistoryEntity } from "../../entities/incoming-document-status-history-entity";
import { IncomingDocumentStatusRepository } from "../../repository/incoming-document-status-history.repository";
import { FindIncomingDocumentStatusHistoriesQuery } from "./find-incoming-document-status-histories.query";

@Injectable()
@QueryHandler(FindIncomingDocumentStatusHistoriesQuery)
export class FindIncomingDocumentStatusHistoriesHandler
  implements IQueryHandler<FindIncomingDocumentStatusHistoriesQuery>
{
  constructor(private readonly statusRepository: IncomingDocumentStatusRepository) {}

  async execute(
    query: FindIncomingDocumentStatusHistoriesQuery,
  ): Promise<PaginatedResponse<IncomingDocumentStatusHistoryResponseDto>> {
    const { data, nextCursor } = await this.statusRepository.findAllByIncomingDocumentId(
      query.incomingDocumentId,
      query.filters,
    );

    return {
      data: data.map((history) => this.toDto(history)),
      nextCursor,
    };
  }

  private toDto(
    history: IncomingDocumentStatusHistoryEntity,
  ): IncomingDocumentStatusHistoryResponseDto {
    const dto = new IncomingDocumentStatusHistoryResponseDto();

    dto.id = history.id;
    dto.incoming_document_id = history.incoming_document_id;

    dto.status_from = history.status_from;
    dto.status_to = history.status_to;

    dto.remarks = history.remarks;

    dto.changed_by = history.changed_by;

    dto.changed_by_user = history.changed_by_user
      ? {
          id: history.changed_by_user.id,
          full_name: history.changed_by_user.full_name,
          position: history.changed_by_user.position,
        }
      : null;

    dto.created_at = history.created_at;

    return dto;
  }
}
