import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { DivisionEntity } from "../entities/division.entity";

@Injectable()
export class DivisionRepository {
  constructor(
    @InjectRepository(DivisionEntity)
    private readonly repository: Repository<DivisionEntity>,
  ) {}

  async save(
    division: Partial<DivisionEntity>,
    manager: EntityManager,
  ): Promise<DivisionEntity> {
    return manager.getRepository(DivisionEntity).save(division);
  }

  async findOne(id: string): Promise<DivisionEntity | null> {
    return this.repository.findOne({
      where: {
        id,
      },
    });
  }

  async findByName(division_name: string): Promise<DivisionEntity | null> {
    return this.repository.findOne({
      where: {
        division_name,
      },
    });
  }
}
