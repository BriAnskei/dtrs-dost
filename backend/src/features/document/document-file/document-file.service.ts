import { Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { DocumentFileRepository } from "./document-file.repository";
import { DocumentFileEntity } from "./entities/document-file.entity";

@Injectable()
export class DocumentFileService {
  constructor(private readonly repository: DocumentFileRepository) {}

  async create(
    data: Partial<DocumentFileEntity>,
    manager: EntityManager,
  ): Promise<DocumentFileEntity> {
    return this.repository.create(data, manager);
  }

  async updateCode(id: string, code: string, manager: EntityManager) {
    const res = await this.repository.updateCode(id, code, manager);

    if (!res) throw new NotFoundException("Document file not found");
  }
}
