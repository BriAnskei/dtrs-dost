import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { DocumentFileEntity } from "./entities/document-file.entity";

@Injectable()
export class DocumentFileRepository {
  constructor(
    @InjectRepository(DocumentFileEntity)
    private readonly repository: Repository<DocumentFileEntity>,
  ) {}

  async create(
    data: Partial<DocumentFileEntity>,
    manager?: EntityManager,
  ): Promise<DocumentFileEntity> {
    const repo = !manager ? this.repository : manager.getRepository(DocumentFileEntity);

    return repo.save(this.repository.create(data));
  }
}
