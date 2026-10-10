import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OutgoingDocumentNotificationHandler } from "../../../common/event-handlers/outgoing-document.notification.handler";
import { OutgoingDocumentAuditHandler } from "../../../common/event-handlers/outgoing-document-audit.handler";
import { StorageModule } from "../../../storage/storage.module";
import { DocumentFileModule } from "../document-file/document-file.module";
import { CreateOutgoingDocumentHandler } from "./commands/create-outgoing-document/create-outgoing-document.handler";
import { OutgoingDocumentController } from "./controller/outgoing-document-controller";
import { OutgoingDocumentEntity } from "./entities/outgoing-document-entity";
import { OutgoingDocumentRepository } from "./repository/outgoing-documents-repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([OutgoingDocumentEntity]),
    DocumentFileModule,
    StorageModule,
  ],
  controllers: [OutgoingDocumentController],
  providers: [
    OutgoingDocumentRepository,
    CreateOutgoingDocumentHandler,
    OutgoingDocumentAuditHandler,
    OutgoingDocumentNotificationHandler,
  ],
})
export class OutgoingDocumentModule {}
