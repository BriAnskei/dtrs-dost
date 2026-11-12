import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { RoutedIncomingDocumentDetailsDto } from "../../dto/get-division-incoming-document-details-dto";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { GetDivisionIncomingDocumentDetailsQuery } from "./get-division-incoming-document-details.query";

@QueryHandler(GetDivisionIncomingDocumentDetailsQuery)
export class GetDivisionIncomingDocumentDetailsHandler
  implements IQueryHandler<GetDivisionIncomingDocumentDetailsQuery>
{
  constructor(private readonly incomingDocumentRepository: IncomingDocumentsRepository) {}

  async execute(
    query: GetDivisionIncomingDocumentDetailsQuery,
  ): Promise<RoutedIncomingDocumentDetailsDto> {
    const { incomingDocumentId, divisionId } = query;

    if (!divisionId) {
      throw new ForbiddenException("Division access is not associated with this user.");
    }

    const document = await this.incomingDocumentRepository.findDetailsByDivision(
      incomingDocumentId,
      divisionId,
    );

    if (!document) {
      throw new NotFoundException("Incoming document not found.");
    }

    return document;
  }
}
