import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { IdempotencyModule } from "@nestjs/idempotency";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthenticationModule } from "./auth/authentication/authentication.module";
import { AuthorizationModule } from "./auth/authorization/authorization.module";
import { IdempotencyPersistenceModule } from "./common/idempotency/idempotency.module";
import { IdempotencyCleanupService } from "./common/idempotency/idempotency-cleanup.service";
import { TypeOrmIdempotencyStore } from "./common/idempotency/stores/typeorm-idempotency.store";
import { getDatabaseConfig } from "./config/database.config";
import { ExtractedDocumentQueueModule } from "./features/document/extracted-document-queue/extracted-document-queue.module";
import { ExtractionModule } from "./features/document/extraction/extraction.module";
import { IncomingDocumentModule } from "./features/document/incoming/incoming.module";
import { OutgoingDocumentModule } from "./features/document/outgoing/ougoing.module";
import { PermissionsModule } from "./features/permissions/permissions.module";
import { UserModule } from "./features/user/user.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CqrsModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60_000,
          limit: 5,
        },
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => getDatabaseConfig(config),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"),
      serveRoot: "/uploads",
    }),

    IdempotencyModule.forRoot({
      scope: (req: { user?: { id: string } }) => req.user?.id,
    }),
    IdempotencyPersistenceModule,

    AuthenticationModule,
    UserModule,
    PermissionsModule,
    AuthorizationModule,

    // Documents
    ExtractionModule,
    ExtractedDocumentQueueModule,
    IncomingDocumentModule,
    OutgoingDocumentModule,
  ],
  controllers: [AppController],
  providers: [AppService, TypeOrmIdempotencyStore, IdempotencyCleanupService],
})
export class AppModule {}
