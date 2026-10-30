import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../../storage/storage.module";
import { UserModule } from "../../user/user.module";
import { DocumentFileModule } from "../document-file/document-file.module";
import { ExtractedDocumentQueueModule } from "../extracted-document-queue/extracted-document-queue.module";
import { AssignIncomingDocumentToDivisionHandler } from "./command/assign-incoming-document-to-division/assign-incoming-document-to-division.handler";
import { CreateIncomingDocumentHandler } from "./command/create-incoming-document/create-incoming-document.handler";
import { CreateIncomingFromQueueHandler } from "./command/create-incoming-from-queue/create-incoming-from-queue.handler";
import { IncomingDocumentController } from "./controller/incoming-document.controller";
import { IncomingDocumentAssignmentEntity } from "./entities/incoming-document-assignment.entity";
import { IncomingDocumentEntity } from "./entities/incoming-document-entity";
import { IncomingDocumentRoutingEntity } from "./entities/incoming-document-routing.entity";
import { IncomingDocumentStatusHistoryEntity } from "./entities/incoming-document-status-history-entity";
import { FindIncomingDocumentsHandler } from "./query/find-incoming-documents/find-incoming-documents.handler";
import { GetAssignedDivisionNoticeCountsHandler } from "./query/get-assigned-division-notice-counts/get-assigned-division-notice-counts.handler";
import { GetIncomingDocumentAssignmentsByRoutingIdHandler } from "./query/get-incoming-document-assignments-by-routing-id/get-incoming-document-assignments-by-routing-id.handler";
import { GetIncomingDocumentDetailsHandler } from "./query/get-incoming-document-detials/get-incoming-document-detials.handler";
import { GetIncomingDocumentFileStreamHandler } from "./query/get-incoming-file-stream/get-incoming-document-file-stream.handler";
import { GetReceiverQueueDetailsHandler } from "./query/get-receiver-queue-details/get-incoming-document-by-queue.handler";
import { IncomingDocumentsRepository } from "./repository/incoming-document.repository";
import { IncomingDocumentAssignmentsRepository } from "./repository/incoming-document-assignment.repository";
import { IncomingDocumentRoutingRepository } from "./repository/incoming-document-routing-repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncomingDocumentEntity,
      IncomingDocumentStatusHistoryEntity,
      IncomingDocumentRoutingEntity,
      IncomingDocumentAssignmentEntity,
    ]),

    UserModule,

    DocumentFileModule,
    StorageModule,
    ExtractedDocumentQueueModule,
  ],
  controllers: [IncomingDocumentController],
  providers: [
    IncomingDocumentsRepository,
    IncomingDocumentRoutingRepository,
    IncomingDocumentAssignmentsRepository,

    CreateIncomingDocumentHandler,
    FindIncomingDocumentsHandler,
    CreateIncomingFromQueueHandler,

    // for receiver
    GetReceiverQueueDetailsHandler,

    GetIncomingDocumentFileStreamHandler,

    GetAssignedDivisionNoticeCountsHandler,

    AssignIncomingDocumentToDivisionHandler,

    GetIncomingDocumentDetailsHandler,

    GetIncomingDocumentAssignmentsByRoutingIdHandler,
  ],
})
export class IncomingDocumentModule {}
