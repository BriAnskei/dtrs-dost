import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { IncomingDocumentEntity } from "../../entities/incoming-document-entity";

@Injectable()
export class IncomingDocumentsWriteRepository {
  async create(
    data: Partial<IncomingDocumentEntity>,
    manager: EntityManager,
  ): Promise<IncomingDocumentEntity> {
    const repository = manager.getRepository(IncomingDocumentEntity);
    return repository.save(repository.create(data));
  }

  async update(
    id: string,
    payload: Partial<IncomingDocumentEntity>,
    manager: EntityManager,
  ): Promise<boolean> {
    const result = await manager.update(IncomingDocumentEntity, id, payload);

    return (result.affected ?? 0) > 0;
  }
}
