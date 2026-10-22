import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  type IdempotencyAcquireResult,
  IdempotencyStorage,
  type IdempotencyStore,
  type IdempotencyStoredPayload,
} from "@nestjs/idempotency";
import { DataSource, MoreThan } from "typeorm";
import { IdempotencyKeyEntity } from "../entities/idempotency-key.entity";

@Injectable()
export class TypeOrmIdempotencyStore implements IdempotencyStore {
  constructor(
    private readonly dataSource: DataSource,
    storage: IdempotencyStorage,
  ) {
    // Registers this PostgreSQL store with the package.
    // Register only one store for the application.
    storage.registerSource(this);
  }

  async acquire(
    key: string,
    owner: string,
    fingerprint: string,
    lockTtl: number,
  ): Promise<IdempotencyAcquireResult> {
    const keyHash = hashOf(key);

    // Retry the lookup if a record expires or disappears
    // between the atomic upsert and the subsequent read.
    for (let attempt = 0; attempt < 5; attempt++) {
      const now = Date.now();

      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(IdempotencyKeyEntity)
        .values({
          keyHash,
          key,
          fingerprint,
          owner,
          response: null,
          expiresAt: now + lockTtl,
        })
        .orUpdate(["fingerprint", "owner", "response", "expires_at"], ["key_hash"], {
          overwriteCondition: {
            where: "idempotency_keys.expires_at <= :now",
            parameters: { now },
          },
        })
        .returning(["keyHash"])
        .updateEntity(false)
        .execute();

      // Only the caller that inserted a new row or took over
      // an expired row receives a returned row.
      if ((result.raw as unknown[]).length === 1) {
        return { state: "acquired" };
      }

      // Another request currently owns the key, or it has
      // already completed. Read its state.
      const record = await this.dataSource.manager.findOneBy(IdempotencyKeyEntity, {
        keyHash,
      });

      if (record && record.expiresAt > now) {
        if (record.response === null) {
          return {
            state: "in-flight",
            fingerprint: record.fingerprint,
          };
        }

        return {
          state: "completed",
          fingerprint: record.fingerprint,
          response: record.response as IdempotencyStoredPayload,
        };
      }
    }

    throw new Error("The idempotency record kept changing; try again");
  }

  async complete(
    key: string,
    owner: string,
    response: IdempotencyStoredPayload,
    ttl: number,
  ): Promise<boolean> {
    const now = Date.now();

    const result = await this.dataSource.manager.update(
      IdempotencyKeyEntity,
      this.ownedBy(key, owner, now),
      {
        owner: null,
        response,
        expiresAt: now + ttl,
      },
    );

    return result.affected === 1;
  }

  async release(key: string, owner: string): Promise<boolean> {
    const result = await this.dataSource.manager.delete(
      IdempotencyKeyEntity,
      this.ownedBy(key, owner, Date.now()),
    );

    return result.affected === 1;
  }

  async extend(key: string, owner: string, lockTtl: number): Promise<boolean> {
    const now = Date.now();

    const result = await this.dataSource.manager.update(
      IdempotencyKeyEntity,
      this.ownedBy(key, owner, now),
      {
        expiresAt: now + lockTtl,
      },
    );

    return result.affected === 1;
  }

  /**
   * Finds a record only while this request still owns its
   * unexpired lock.
   *
   * This condition is part of the UPDATE or DELETE itself,
   * not a separate check before writing.
   */
  private ownedBy(key: string, owner: string, now: number) {
    return {
      keyHash: hashOf(key),
      owner,
      expiresAt: MoreThan(now),
    };
  }

  /**
   * Hash the scoped record key before using it as a primary key.
   */
  async prune(limit = 1000): Promise<number> {
    const now = Date.now();

    const expired = this.dataSource.manager
      .createQueryBuilder(IdempotencyKeyEntity, "expired")
      .select("expired.keyHash")
      .where("expired.expiresAt <= :now", { now })
      .limit(limit);

    const result = await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(IdempotencyKeyEntity)
      .where(`key_hash IN (${expired.getQuery()})`)
      .andWhere("expires_at <= :now", { now })
      .setParameters(expired.getParameters())
      .execute();

    return result.affected ?? 0;
  }
}

function hashOf(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
