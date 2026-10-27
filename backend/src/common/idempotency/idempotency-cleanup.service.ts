import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TypeOrmIdempotencyStore } from "./stores/typeorm-idempotency.store";

@Injectable()
export class IdempotencyCleanupService {
  private readonly logger = new Logger(IdempotencyCleanupService.name);
  private static readonly BATCH_SIZE = 1000;

  constructor(private readonly store: TypeOrmIdempotencyStore) {}

  @Cron(CronExpression.EVERY_HOUR)
  async pruneExpiredRecords(): Promise<void> {
    let total = 0;
    let deleted: number;

    do {
      deleted = await this.store.prune(IdempotencyCleanupService.BATCH_SIZE);
      total += deleted;
    } while (deleted === IdempotencyCleanupService.BATCH_SIZE);

    if (total > 0) {
      this.logger.log(`Deleted ${total} expired idempotency records`);
    }
  }
}
