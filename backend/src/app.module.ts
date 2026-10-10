import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthenticationModule } from "./auth/authentication/authentication.module";
import { AuthorizationModule } from "./auth/authorization/authorization.module";
import { getDatabaseConfig } from "./config/database.config";
import { ExtractedDocumentQueueModule } from "./features/document/extracted-document-queue/extracted-document-queue.module";
import { ExtractionModule } from "./features/document/extraction/extraction.module";
import { OutgoingDocumentModule } from "./features/document/outgoing/ougoing.module";
import { PermissionsModule } from "./features/permissions/permissions.module";
import { UserModule } from "./features/user/user.module";

@Module({
  imports: [
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
    AuthenticationModule,
    UserModule,
    PermissionsModule,
    AuthorizationModule,

    // Documents
    ExtractionModule,
    ExtractedDocumentQueueModule,
    OutgoingDocumentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
