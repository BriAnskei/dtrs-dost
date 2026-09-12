import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { LessThan } from "typeorm";
import { RefreshTokenEntity } from "../entities/refresh-token.entity";

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repository: Repository<RefreshTokenEntity>,
  ) {}

  async save(refreshToken: RefreshTokenEntity): Promise<RefreshTokenEntity> {
    return this.repository.save(refreshToken);
  }

  async findOne(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({
      where: {
        token_hash: tokenHash,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.repository.delete({ token_hash: tokenHash });
  }

  async deleteExpiredByUserId(userId: string): Promise<void> {
    await this.repository.delete({
      user_id: userId,
      expires_at: LessThan(new Date()),
    });
  }
}
