import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthenticationModule } from "./authentication/authentication.module";
import { getDatabaseConfig } from "./config/database.config";
import { AiExtractorController } from "./controllers/ai-extractor.controller";
import { DivisionsController } from "./controllers/divisions.controller";
import { DocumentQueueController } from "./controllers/document-queue.controller";
import { IncomingDocumentsController } from "./controllers/incoming-documents.controller";
import { InvalidDocumentsController } from "./controllers/invalid-documents.controller";
import { UploadController } from "./controllers/upload.controller";
import { Division } from "./entities/division.entity";
import { DocumentRouting } from "./entities/document-routing.entity";
import { IncomingDocQueue } from "./entities/incoming-doc-queue.entity";
import { IncomingDocumentFile } from "./entities/incoming-document-file.entity";
import { IncomingDocuments } from "./entities/incoming-documents.entity";
import { InvalidDocument } from "./entities/invalid-document.entity";
import { Role } from "./entities/role.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        console.log("DATABASE_URL:", config.get("DATABASE_URL"));

        return getDatabaseConfig(config);
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"),
      serveRoot: "/uploads",
    }),
    TypeOrmModule.forFeature([
      Role,
      IncomingDocumentFile,
      InvalidDocument,
      IncomingDocQueue,
      IncomingDocuments,
      Division,
      DocumentRouting,
    ]),
    AuthenticationModule,
  ],
  controllers: [
    AppController,
    UploadController,
    InvalidDocumentsController,
    DocumentQueueController,
    AiExtractorController,
    DivisionsController,
    IncomingDocumentsController,
  ],
  providers: [AppService],
})
export class AppModule {}
