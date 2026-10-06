import { Injectable } from "@nestjs/common";
import { DocumentFileRepository } from "./document-file.repository";
import { DocumentFileEntity } from "./entities/document-file.entity";
import { EntityManager } from "typeorm";

@Injectable()
export class DocumentFileService {
  constructor(private readonly service: DocumentFileRepository) {}

  async create(
    data: Partial<DocumentFileEntity>,
    manager: EntityManager,
  ): Promise<DocumentFileEntity> {
    return this.service.create(data, manager);
  }
}
