import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  IncomingDocumentAssignmentEntity,
  OfficeType,
} from "../../entities/incoming-document-assignment.entity";
import { IncomingDocumentRoutingEntity } from "../../entities/incoming-document-routing.entity";
import { AssignedDivisionNoticeCount } from "../../types/assigned-division-notice-count.type";
import { GetAssignedDivisionNoticeCountsQuery } from "./get-assigned-division-notice-counts.query";

@QueryHandler(GetAssignedDivisionNoticeCountsQuery)
export class GetAssignedDivisionNoticeCountsHandler
  implements IQueryHandler<GetAssignedDivisionNoticeCountsQuery>
{
  constructor(
    @InjectRepository(IncomingDocumentRoutingEntity)
    private readonly routingRepository: Repository<IncomingDocumentRoutingEntity>,
  ) {}

  async execute(
    query: GetAssignedDivisionNoticeCountsQuery,
  ): Promise<AssignedDivisionNoticeCount[]> {
    const results = await this.routingRepository
      .createQueryBuilder("routing")
      .innerJoin("routing.division", "division")
      .leftJoin(
        IncomingDocumentAssignmentEntity,
        "assignment",
        `assignment.incoming_document_id = routing.incoming_document_id
       AND assignment.division_id = routing.division_id
       AND assignment.office_type = :officeType`,
        { officeType: OfficeType.DIVISION },
      )
      .where("routing.incoming_document_id = :incomingDocumentId", {
        incomingDocumentId: query.incomingDocumentId,
      })
      .select("division.id", "division_id")
      .addSelect("division.division_name", "division_name")
      .addSelect("COUNT(assignment.id)", "total_assignments")
      .groupBy("division.id")
      .addGroupBy("division.division_name")
      .orderBy("division.division_name", "ASC")
      .getRawMany<{
        division_id: string;
        division_name: string;
        total_assignments: string;
      }>();

    return results.map((division) => ({
      division_id: division.division_id,
      division_name: division.division_name,
      total_assignments: Number(division.total_assignments),
    }));
  }
}
