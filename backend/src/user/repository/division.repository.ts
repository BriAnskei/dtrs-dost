import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, ILike, Repository } from "typeorm";
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

  async searchByName(search: string): Promise<DivisionEntity[] | null> {
    const escapeLike = (value: string): string => {
      return value.replace(/[\\%_]/g, "\\$&");
    };

    return this.repository.find({
      where: search.trim()
        ? {
            division_name: ILike(`%${escapeLike(search)}%`),
          }
        : undefined,
      order: {
        division_name: "ASC",
      },
      take: 20,
    });
  }
}
