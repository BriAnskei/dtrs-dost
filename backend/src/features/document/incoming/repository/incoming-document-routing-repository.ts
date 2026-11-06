import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";

import { IncomingDocumentRoutingEntity } from "../entities/incoming-document-routing.entity";

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

  async findByIdForUpdate(
    routingId: string,
    manager: EntityManager,
  ): Promise<IncomingDocumentRoutingEntity | null> {
    return manager
      .getRepository(IncomingDocumentRoutingEntity)
      .createQueryBuilder("routing")
      .setLock("pessimistic_write")
      .where("routing.id = :routingId", { routingId })
      .getOne();
  }

  async findByIncomingDocumentAndDivision(
    incomingDocumentId: string,
    divisionId: string,
    manager: EntityManager,
  ): Promise<IncomingDocumentRoutingEntity | null> {
    return manager.getRepository(IncomingDocumentRoutingEntity).findOne({
      where: {
        incoming_document_id: incomingDocumentId,
        division_id: divisionId,
      },
    });
  }

  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<IncomingDocumentRoutingEntity | null> {
    const repo = manager?.getRepository(IncomingDocumentRoutingEntity) ?? this.repository;

    return repo.findOne({ where: { id } });
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
      .leftJoin("routing.assignment_counters", "routingCounts")
      .where("routing.incoming_document_id = :incomingDocumentId", {
        incomingDocumentId,
      })
      .select("routing.id", "routing_id")
      .addSelect("division.id", "division_id")
      .addSelect("division.division_name", "division_name")
      .addSelect("COALESCE(routingCounts.total, 0)", "total_assignments")
      .addSelect("COALESCE(routingCounts.complete, 0)", "action_taken_count")
      .orderBy("division.division_name", "ASC")
      .getRawMany();
  }

  async delete(id: string, manager: EntityManager): Promise<boolean> {
    const result = await manager.getRepository(IncomingDocumentRoutingEntity).delete(id);

    return (result.affected ?? 0) > 0;
  }
}
