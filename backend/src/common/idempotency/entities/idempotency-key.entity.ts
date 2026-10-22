import { Column, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * TypeORM returns PostgreSQL BIGINT values as strings by default.
 * The idempotency package expects expiration times in milliseconds
 * as JavaScript numbers.
 */
const epochMilliseconds = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity("idempotency_keys")
@Index("idempotency_keys_expires_at_idx", ["expiresAt"])
export class IdempotencyKeyEntity {
  @PrimaryColumn({
    type: "text",
    name: "key_hash",
  })
  keyHash!: string;

  @Column({
    type: "text",
  })
  key!: string;

  @Column({
    type: "text",
  })
  fingerprint!: string;

  /**
   * The owner of an in-progress request.
   * Null means the request has completed.
   */
  @Column({
    type: "text",
    nullable: true,
  })
  owner!: string | null;

  /**
   * Null while processing.
   * Contains the original HTTP response after completion.
   */
  @Column({
    type: "json",
    nullable: true,
  })
  response!: object | null;

  /**
   * Unix epoch timestamp in milliseconds.
   */
  @Column({
    type: "bigint",
    name: "expires_at",
    transformer: epochMilliseconds,
  })
  expiresAt!: number;
}
