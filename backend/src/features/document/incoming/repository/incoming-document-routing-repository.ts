import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import {
  IncomingDocumentAssignmentEntity,
  OfficeType,
} from "../entities/incoming-document-assignment.entity";
import { IncomingDocumentRoutingEntity } from "../entities/incoming-document-routing.entity";
import { AssignmentStatus } from "../enums/assignment-status.enum";

@Injectable()
export class IncomingDocumentRoutingRepository {
  constructor(
    @InjectRepository(IncomingDocumentRoutingEntity)
    private readonly repository: Repository<IncomingDocumentRoutingEntity>,
  ) {}

  async create(
    routing: Partial<IncomingDocumentRoutingEntity>,
    manager: EntityManager,
  ): Promise<IncomingDocumentRoutingEntity> {
    return manager.getRepository(IncomingDocumentRoutingEntity).save(routing);
  }

  async exists(
    incomingDocumentId: string,
    divisionId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repository = manager
      ? manager.getRepository(IncomingDocumentRoutingEntity)
      : this.repository;

    return repository.exists({
      where: {
        incoming_document_id: incomingDocumentId,
        division_id: divisionId,
      },
    });
  }

  findAssignedDivisionNoticeCountsByIncomingId(incomingDocumentId: string): Promise<
    {
      routing_id: string;
      division_id: string;
      division_name: string;
      total_assignments: string;
      action_taken_count: string;
    }[]
  > {
    return this.repository
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
        incomingDocumentId,
      })
      .select("routing.id", "routing_id")
      .addSelect("division.id", "division_id")
      .addSelect("division.division_name", "division_name")
      .addSelect("COUNT(assignment.id)", "total_assignments")
      .addSelect(
        `COUNT(
        CASE WHEN assignment.status = :completedStatus THEN 1 END
      )`,
        "action_taken_count",
      )
      .setParameter("completedStatus", AssignmentStatus.COMPLETE)
      .groupBy("routing.id")
      .addGroupBy("division.id")
      .addGroupBy("division.division_name")
      .orderBy("division.division_name", "ASC")
      .getRawMany<{
        routing_id: string;
        division_id: string;
        division_name: string;
        total_assignments: string;
        action_taken_count: string;
      }>();
  }
}
