import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../../storage/storage.module";
import { DocumentFileModule } from "../document-file/document-file.module";
import { ExtractedDocumentQueueModule } from "../extracted-document-queue/extracted-document-queue.module";
import { CreateIncomingFromQueueHandler } from "./command/ create-incoming-from-queue/create-incoming-from-queue.handler";
import { CreateIncomingDocumentHandler } from "./command/create-incoming-document/create-incoming-document.handler";
import { IncomingDocumentController } from "./controller/incoming-document.controller";
import { IncomingDocumentAssignmentEntity } from "./entities/incoming-document-assignment.entity";
import { IncomingDocumentEntity } from "./entities/incoming-document-entity";
import { IncomingDocumentRoutingEntity } from "./entities/incoming-document-routing.entity";
import { IncomingDocumentStatusHistoryEntity } from "./entities/incoming-document-status-history-entity";
import { FindIncomingDocumentsHandler } from "./query/find-incoming-documents/find-incoming-documents.handler";
import { GetIncomingDocumentFileStreamHandler } from "./query/get-incoming-file-stream/get-incoming-document-file-stream.handler";
import { GetReceiverQueueDetailsHandler } from "./query/get-receiver-queue-details/get-incoming-document-by-queue.handler";
import { IncomingDocumentsRepository } from "./repository/incoming-document.repository";

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
    ExtractedDocumentQueueModule,
  ],
  controllers: [IncomingDocumentController],
  providers: [
    IncomingDocumentsRepository,
    CreateIncomingDocumentHandler,
    FindIncomingDocumentsHandler,
    CreateIncomingFromQueueHandler,

    // for receiver
    GetReceiverQueueDetailsHandler,

    GetIncomingDocumentFileStreamHandler,
  ],
})
export class IncomingDocumentModule {}
