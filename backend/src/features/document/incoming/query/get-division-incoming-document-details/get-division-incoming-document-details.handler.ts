import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { RoutedIncomingDocumentDetailsDto } from "../../dto/get-division-incoming-document-details-dto";
import { IncomingDocumentsReadRepository } from "../../repository/incoming-document-repository/incoming-document.read.repository";
import { GetDivisionIncomingDocumentDetailsQuery } from "./get-division-incoming-document-details.query";

@QueryHandler(GetDivisionIncomingDocumentDetailsQuery)
export class GetDivisionIncomingDocumentDetailsHandler
  implements IQueryHandler<GetDivisionIncomingDocumentDetailsQuery>
{
  constructor(private readonly incomingReadRepository: IncomingDocumentsReadRepository) {}

  async execute(
    query: GetDivisionIncomingDocumentDetailsQuery,
  ): Promise<RoutedIncomingDocumentDetailsDto> {
    const { incomingDocumentId, divisionId } = query;

    if (!divisionId) {
      throw new ForbiddenException("Division access is not associated with this user.");
    }

    const document = await this.incomingReadRepository.findDetailsByDivision(
      incomingDocumentId,
      divisionId,
    );

    if (!document) {
      throw new NotFoundException("Incoming document not found.");
    }

    return document;
  }
}
