import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../../storage/storage.module";
import { DocumentFileModule } from "../document-file/document-file.module";
import { CreateIncomingDocumentHandler } from "./command/create-incoming-document/create-incoming-document.handler";
import { IncomingDocumentController } from "./controller/incoming-document.controller";
import { IncomingDocumentAssignmentEntity } from "./entities/incoming-document-assignment.entity";
import { IncomingDocumentEntity } from "./entities/incoming-document-entity";
import { IncomingDocumentRoutingEntity } from "./entities/incoming-document-routing.entity";
import { IncomingDocumentStatusHistoryEntity } from "./entities/incoming-document-status-history-entity";
import { IncomingDocumentRepository } from "./repository/incoming-document.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncomingDocumentEntity,
      IncomingDocumentStatusHistoryEntity,
      IncomingDocumentRoutingEntity,
      IncomingDocumentAssignmentEntity,
    ]),
    DocumentFileModule,
    StorageModule,
  ],
  controllers: [IncomingDocumentController],
  providers: [IncomingDocumentRepository, CreateIncomingDocumentHandler],
})
export class IncomingDocumentModule {}
