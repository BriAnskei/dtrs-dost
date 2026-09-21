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
  ): Promise<PasswordResetTokenEntity> {
    const token = this.repository.create({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return this.repository.save(token);
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
  ): Promise<PasswordResetTokenEntity | null> {
    return this.repository
      .createQueryBuilder("reset")
      .setLock("pessimistic_write")
      .where("reset.token_hash = :tokenHash", {
        tokenHash,
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
