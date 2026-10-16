import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { IncomingDocumentEntity } from "../entities/incoming-document-entity";

@Injectable()
export class IncomingDocumentRepository {
  constructor(
    @InjectRepository(IncomingDocumentEntity)
    private readonly repository: Repository<IncomingDocumentEntity>,
  ) {}

  async create(
    data: Partial<IncomingDocumentEntity>,
    manager: EntityManager,
  ): Promise<IncomingDocumentEntity> {
    const repository = manager.getRepository(IncomingDocumentEntity);
    const entity = repository.create(data);

    return repository.save(entity);
  }
}
