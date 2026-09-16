import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthenticationModule } from "./auth/authentication/authentication.module copy";
import { getDatabaseConfig } from "./config/database.config";

import { IncomingDocQueue } from "./entities/incoming-doc-queue.entity";
import { IncomingDocumentFile } from "./entities/incoming-document-file.entity";
import { InvalidDocument } from "./entities/invalid-document.entity";
import { UserModule } from "./user/user.module";
import { DivisionController } from './src/user/controllers/division/division.controller';
import { DivisionController } from './controllers/division.controller';
import { AuthorizationModule } from './authorization.module';
import { AuthorizationModule } from './auth/authorization/authorization.module';
import { AuthorizationModuleTsModule } from './auth/authorization/authorization.module.ts.module';

@Module({
  imports: [
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
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => getDatabaseConfig(config),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"),
      serveRoot: "/uploads",
    }),
    TypeOrmModule.forFeature([IncomingDocumentFile, InvalidDocument, IncomingDocQueue]),
    AuthenticationModule,
    UserModule,
    AuthorizationModule,
    AuthorizationModuleTsModule,
  ],
  controllers: [AppController, DivisionController],
  providers: [AppService],
})
export class AppModule {}
