import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { IncomingDocumentAssignmentEntity } from "../entities/incoming-document-assignment.entity";
import { IncomingDocumentRoutingEntity } from "../entities/incoming-document-routing.entity";

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
