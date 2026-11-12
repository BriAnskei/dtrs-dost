import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { PasswordResetTokenEntity } from "../entities/password-reset-token.entity";

@Injectable()
export class PasswordResetRepository {
  constructor(
    @InjectRepository(PasswordResetTokenEntity)
    private readonly repository: Repository<PasswordResetTokenEntity>,
  ) {}

  async createToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    manager?: EntityManager,
  ): Promise<PasswordResetTokenEntity> {
    const repo = manager ? manager.getRepository(PasswordResetTokenEntity) : this.repository;

    const token = repo.create({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return repo.save(token);
  }

  async findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<PasswordResetTokenEntity | null> {
    const repo = manager ? manager.getRepository(PasswordResetTokenEntity) : this.repository;

    return repo.findOne({
      where: {
        user_id: userId,
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenEntity | null> {
    return this.repository.findOne({
      where: {
        token_hash: tokenHash,
      },
    });
  }

  async findByTokenHashForUpdate(
    tokenHash: string,
    manager: EntityManager,
  ): Promise<PasswordResetTokenEntity | null> {
    return manager
      .getRepository(PasswordResetTokenEntity)
      .createQueryBuilder("reset")
      .setLock("pessimistic_write")
      .where("reset.token_hash = :tokenHash", {
        tokenHash,
      })
      .getOne();
  }

  /**
   * Locks the reset-token row scoped by `user_id` (unique) for the duration of
   * the transaction. When no row exists yet, the gap lock on the unique index
   * blocks concurrent inserts of the same `user_id`, so `createResetRequest`
   * can check-then-create without a duplicate-key race.
   */
  async findByUserIdForUpdate(
    userId: string,
    manager: EntityManager,
  ): Promise<PasswordResetTokenEntity | null> {
    return manager
      .getRepository(PasswordResetTokenEntity)
      .createQueryBuilder("reset")
      .setLock("pessimistic_write")
      .where("reset.user_id = :userId", {
        userId,
      })
      .getOne();
  }
  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({
      user_id: userId,
    });
  }

  async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo = manager
      ? manager.getRepository(PasswordResetTokenEntity)
      : this.repository;

    const result = await repo.delete(id);

    return (result.affected ?? 0) > 0;
  }
}
