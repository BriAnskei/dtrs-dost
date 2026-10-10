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

  async updateCode(id: string, code: string, manager?: EntityManager): Promise<boolean> {
    const repo = manager ? manager.getRepository(DocumentFileEntity) : this.repository;

    const result = await repo.update({ id }, { code });

    return (result.affected ?? 0) > 0;
  }
}
