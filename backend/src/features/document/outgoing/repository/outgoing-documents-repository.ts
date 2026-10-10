import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { OutgoingDocumentEntity } from "../entities/outgoing-document-entity";

@Injectable()
export class OutgoingDocumentRepository {
  constructor(
    @InjectRepository(OutgoingDocumentEntity)
    private readonly repository: Repository<OutgoingDocumentEntity>,
  ) {}

  async create(
    data: Partial<OutgoingDocumentEntity>,
    manager: EntityManager,
  ): Promise<OutgoingDocumentEntity> {
    const repository = manager.getRepository(OutgoingDocumentEntity);

    const outgoingDocument = repository.create(data);

    return repository.save(outgoingDocument);
  }
}
