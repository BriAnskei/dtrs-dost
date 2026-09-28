import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { EntityManager, Repository } from "typeorm";
import { UserEntity } from "../../features/user/entities/user.entity";

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async create(userData: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repository.create(userData);

    return this.repository.save(user);
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
}
