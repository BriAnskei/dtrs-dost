import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RoleEntity } from "../entities/role.entity";

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  async findOne(id: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: {
        id,
      },
    });
  }
}
