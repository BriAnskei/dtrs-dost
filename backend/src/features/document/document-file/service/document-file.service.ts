import { Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { DocumentFileEntity } from "../entities/document-file.entity";
import { DocumentFileRepository } from "../repository/document-file.repository";

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

  async findById(id: string): Promise<DocumentFileEntity> {
    const documentFile = await this.repository.findById(id);

    if (!documentFile) throw new NotFoundException("Document file does not exist");

    return documentFile;
  }
}
