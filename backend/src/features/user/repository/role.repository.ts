import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { RoleEntity } from "../entities/role.entity";

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  async findById(id: string, manager?: EntityManager): Promise<RoleEntity | null> {
    const repo = manager ? manager.getRepository(RoleEntity) : this.repository;
    return repo.findOne({
      where: {
        id,
      },
    });
  }
}
