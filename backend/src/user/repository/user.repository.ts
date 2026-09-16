import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { EntityManager, Repository } from "typeorm";
import { UserEntity } from "../entities/user.entity";

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async create(
    userData: Partial<UserEntity>,
    manager: EntityManager,
  ): Promise<UserEntity> {
    return manager.getRepository(UserEntity).save(userData);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { email },
    });
  }

  async findById(id: string, manager?: EntityManager): Promise<UserEntity | null> {
    const repo = manager ? manager.getRepository(UserEntity) : this.repository;

    return repo.findOne({
      where: { id },
    });
  }

  async findByIdWithRelation(id: string, manager?: EntityManager): Promise<UserEntity> {
    const repo = manager ? manager.getRepository(UserEntity) : this.repository;

    return repo.findOneOrFail({
      where: { id },
      relations: {
        role: true,
        division: true,
      },
    });
  }

  async findAllWithRelation(): Promise<UserEntity[]> {
    return this.repository.find({
      relations: {
        role: true,
        division: true,
      },
    });
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await this.repository.update(id, {
      is_active: false,
    });

    return (result.affected ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);

    return (result.affected ?? 0) > 0;
  }
}
