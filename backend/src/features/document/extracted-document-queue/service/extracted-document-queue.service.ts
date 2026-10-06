import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { ExtractedDocumentQueueEntity } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueRepository } from "../repository/extracted-document-queue.repository";

@Injectable()
export class ExtractedDocumentQueueService {
  constructor(private readonly repository: ExtractedDocumentQueueRepository) {}

  async create(
    data: Partial<ExtractedDocumentQueueEntity>,
    manager: EntityManager,
  ): Promise<ExtractedDocumentQueueEntity> {
    return this.repository.create(data, manager);
  }
}
