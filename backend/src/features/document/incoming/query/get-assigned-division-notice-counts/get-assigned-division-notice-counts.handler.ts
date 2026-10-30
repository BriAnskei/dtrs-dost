import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { AssignedDivisionNoticeCount } from "../../types/assigned-division-notice-count.type";
import { GetAssignedDivisionNoticeCountsQuery } from "./get-assigned-division-notice-counts.query";

@QueryHandler(GetAssignedDivisionNoticeCountsQuery)
export class GetAssignedDivisionNoticeCountsHandler
  implements IQueryHandler<GetAssignedDivisionNoticeCountsQuery>
{
  constructor(private readonly routingRepository: IncomingDocumentRoutingRepository) {}

  async execute(
    query: GetAssignedDivisionNoticeCountsQuery,
  ): Promise<AssignedDivisionNoticeCount[]> {
    const results =
      await this.routingRepository.findAssignedDivisionNoticeCountsByIncomingId(
        query.incomingDocumentId,
      );

    return results.map((division) => ({
      routing_id: division.routing_id,
      division_id: division.division_id,
      division_name: division.division_name,
      total_assignments: Number(division.total_assignments),
      action_taken_count: Number(division.action_taken_count),
    }));
  }
}
