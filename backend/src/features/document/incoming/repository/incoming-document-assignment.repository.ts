import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { AssignmentSort } from "../dto/get-incoming-document-assignments-dto";
import { IncomingDocumentAssignmentEntity } from "../entities/incoming-document-assignment.entity";
import { IncomingDocumentRoutingEntity } from "../entities/incoming-document-routing.entity";
import { GetIncomingDocumentAssignmentsFilters } from "../types/get-incoming-document-assignment.type";

@Injectable()
export class IncomingDocumentAssignmentsRepository {
  constructor(
    @InjectRepository(IncomingDocumentAssignmentEntity)
    private readonly repository: Repository<IncomingDocumentAssignmentEntity>,
  ) {}

  async insertMany(
    assignments: Partial<IncomingDocumentAssignmentEntity>[],
    manager: EntityManager,
  ): Promise<void> {
    if (assignments.length === 0) {
      return;
    }

    await manager.getRepository(IncomingDocumentAssignmentEntity).insert(assignments);
  }

  async findAllByRoutingId(
    routingId: string,
  ): Promise<IncomingDocumentAssignmentEntity[]> {
    return this.repository
      .createQueryBuilder("assignment")
      .innerJoin(
        IncomingDocumentRoutingEntity,
        "routing",
        `
          routing.incoming_document_id = assignment.incoming_document_id
          AND routing.division_id = assignment.division_id
        `,
      )
      .leftJoinAndSelect("assignment.division", "division")
      .leftJoinAndSelect("assignment.created_by", "createdBy")
      .leftJoinAndSelect("assignment.action_taken_by", "actionTakenBy")
      .where("routing.id = :routingId", { routingId })
      .orderBy("assignment.created_at", "ASC")
      .getMany();
  }

  async findAllByIncomingDocumentId(
    incomingDocumentId: string,
    filters: GetIncomingDocumentAssignmentsFilters,
  ): Promise<IncomingDocumentAssignmentEntity[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("assignment")

      // Assigned by
      .leftJoin("assignment.created_by", "createdBy")
      .addSelect(["createdBy.id", "createdBy.full_name", "createdBy.position"])

      // Division
      .leftJoin("assignment.division", "division")
      .addSelect(["division.id", "division.division_name"])

      // Action taken by
      .leftJoin("assignment.action_taken_by", "actionTakenBy")
      .addSelect([
        "actionTakenBy.id",
        "actionTakenBy.full_name",
        "actionTakenBy.position",
      ])

      .where("assignment.incoming_document_id = :incomingDocumentId", {
        incomingDocumentId,
      });

    if (filters.status) {
      queryBuilder.andWhere("assignment.status = :status", {
        status: filters.status,
      });
    }

    if (filters.officeType) {
      queryBuilder.andWhere("assignment.office_type = :officeType", {
        officeType: filters.officeType,
      });
    }

    const direction = filters.sort === AssignmentSort.OLDEST ? "ASC" : "DESC";

    queryBuilder
      .orderBy("assignment.created_at", direction)
      .addOrderBy("assignment.id", direction);

    return queryBuilder.getMany();
  }

  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<IncomingDocumentAssignmentEntity | null> {
    const repo =
      manager?.getRepository(IncomingDocumentAssignmentEntity) ?? this.repository;

    return repo.findOne({
      where: { id },
    });
  }

  async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo =
      manager?.getRepository(IncomingDocumentAssignmentEntity) ?? this.repository;

    const res = await repo.delete(id);

    return (res.affected ?? 0) > 0;
  }
}
