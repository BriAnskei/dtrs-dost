import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IdempotencyKeyEntity } from "./entities/idempotency-key.entity";

@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyKeyEntity])],
  exports: [TypeOrmModule],
})
export class IdempotencyPersistenceModule {}
