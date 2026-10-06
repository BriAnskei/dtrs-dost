import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ExtractedDocumentQueueEntity } from "../entities/extracted-document-queue.entity";

@Injectable()
export class ExtractedDocumentQueueRepository {
  constructor(
    @InjectRepository(ExtractedDocumentQueueEntity)
    private readonly repository: Repository<ExtractedDocumentQueueEntity>,
  ) {}

  async create(
    data: Partial<ExtractedDocumentQueueEntity>,
    manager?: EntityManager,
  ): Promise<ExtractedDocumentQueueEntity> {
    const repo = !manager
      ? this.repository
      : manager.getRepository(ExtractedDocumentQueueEntity);

    return repo.save(this.repository.create(data));
  }
}
