import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { SearchRoutedDivisionQuery } from "./search-routed-division.query";

@QueryHandler(SearchRoutedDivisionQuery)
export class SearchRoutedDivisionHandler
  implements IQueryHandler<SearchRoutedDivisionQuery>
{
  constructor(private readonly routingRepository: IncomingDocumentRoutingRepository) {}

  execute(query: SearchRoutedDivisionQuery) {
    return this.routingRepository.searchRoutedDivisions(
      query.incomingDocumentId,
      query.search,
    );
  }
}
