import { ForbiddenException, Injectable } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { PaginatedResponse } from "../../../../../common/pagination/paginated-response";
import { DivisionIncomingDocumentResponseDto } from "../../dto/division-incoming-document-response.dto";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { FindDivisionIncomingDocumentsQuery } from "./find-division-incoming-documents.query";

@QueryHandler(FindDivisionIncomingDocumentsQuery)
@Injectable()
export class FindDivisionIncomingDocumentsHandler
  implements IQueryHandler<FindDivisionIncomingDocumentsQuery>
{
  constructor(private readonly routingRepository: IncomingDocumentRoutingRepository) {}

  async execute(
    query: FindDivisionIncomingDocumentsQuery,
  ): Promise<PaginatedResponse<DivisionIncomingDocumentResponseDto>> {
    if (!query.division_id) {
      throw new ForbiddenException(
        "Only users assigned to a division can access this resource.",
      );
    }

    const result = await this.routingRepository.findAllByDivision(
      query.division_id,
      query.filters,
    );

    return {
      data: result.data.map(
        (routing): DivisionIncomingDocumentResponseDto => ({
          id: routing.incoming_document.id,
          code: routing.incoming_document.document_file.code,
          subject: routing.incoming_document.subject,
          status: routing.incoming_document.status,
          routed_at: routing.routed_at,
        }),
      ),
      nextCursor: result.nextCursor,
    };
  }
}
