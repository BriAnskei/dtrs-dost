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
}
