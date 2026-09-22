import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { EntityManager, LessThan } from "typeorm";
import { RefreshTokenEntity } from "../entities/refresh-token.entity";

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repository: Repository<RefreshTokenEntity>,
  ) {}

  async save(
    token: Partial<RefreshTokenEntity>,
    manager: EntityManager,
  ): Promise<RefreshTokenEntity> {
    return manager.getRepository(RefreshTokenEntity).save(token);
  }

  async findOne(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({
      where: {
        token_hash: tokenHash,
      },
    });
  }

  async consume(
    tokenHash: string,
    manager: EntityManager,
  ): Promise<RefreshTokenEntity | null> {
    const result = await manager
      .createQueryBuilder()
      .delete()
      .from(RefreshTokenEntity)
      .where("token_hash = :tokenHash", {
        tokenHash,
      })
      .andWhere("expires_at > NOW()")
      .returning("*")
      .execute();

    const deletedToken = result.raw[0];

    if (!deletedToken) {
      return null;
    }

    return this.repository.create({
      id: deletedToken.id,
      user_id: deletedToken.user_id,
      token_hash: deletedToken.token_hash,
      expires_at: deletedToken.expires_at,
      remembered: deletedToken.remembered,
      created_at: deletedToken.created_at,
    });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.repository.delete({ token_hash: tokenHash });
  }

  async deleteByUserId(userId: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(RefreshTokenEntity) : this.repository;

    repo.delete({ user_id: userId });
  }

  async deleteExpiredByUserId(userId: string): Promise<void> {
    await this.repository.delete({
      user_id: userId,
      expires_at: LessThan(new Date()),
    });
  }
}
