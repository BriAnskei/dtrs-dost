import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../../storage/storage.module";
import { UserModule } from "../../user/user.module";
import { DocumentFileModule } from "../document-file/document-file.module";
import { ExtractedDocumentQueueModule } from "../extracted-document-queue/extracted-document-queue.module";
import { AssignIncomingDocumentToDivisionHandler } from "./command/assign-incoming-document-to-division/assign-incoming-document-to-division.handler";
import { CompleteIncomingDocumentAssignmentHandler } from "./command/complete-incoming-document-assignment/complete-incoming-document-assignment.handler";
import { CreateIncomingDocumentHandler } from "./command/create-incoming-document/create-incoming-document.handler";
import { CreateIncomingDocumentAssignmentsHandler } from "./command/create-incoming-document-assigments/create-incoming-document-assigments.handler";
import { CreateIncomingFromQueueHandler } from "./command/create-incoming-from-queue/create-incoming-from-queue.handler";
import { DeleteIncomingDocumentAssignmentHandler } from "./command/delete-incoming-document-assignment/delete-incoming-document-assignment.handler";
import { DeleteIncomingDocumentRoutingHandler } from "./command/delete-incoming-document-routing/delete-incoming-document-routing.handler";
import { IncomingDocumentController } from "./controller/incoming-document.controller";
import { IncomingDocumentRoutingController } from "./controller/incomint-document-routing.controller";
import { IncomingDocumentAssignmentEntity } from "./entities/incoming-document-assignment.entity";
import { IncomingDocumentAssignmentCountEntity } from "./entities/incoming-document-assignment-count.entity";
import { IncomingDocumentEntity } from "./entities/incoming-document-entity";
import { IncomingDocumentRoutingEntity } from "./entities/incoming-document-routing.entity";
import { IncomingDocumentRoutingAssignmentCounterEntity } from "./entities/incoming-document-routing-assignment-counter.entity";
import { IncomingDocumentStatusHistoryEntity } from "./entities/incoming-document-status-history-entity";
import { FindDivisionIncomingDocumentsHandler } from "./query/find-division-incoming-documents/find-division-incoming-documents.handler";
import { FindIncomingDocumentsHandler } from "./query/find-incoming-documents/find-incoming-documents.handler";
import { GetAssignedDivisionNoticeCountsHandler } from "./query/get-assigned-division-notice-counts/get-assigned-division-notice-counts.handler";
import { GetDivisionIncomingDocumentAssignmentsHandler } from "./query/get-division-incoming-document-assignments/get-division-incoming-document-assignments.handler";
import { GetDivisionIncomingDocumentDetailsHandler } from "./query/get-division-incoming-document-details/get-division-incoming-document-details.handler";
import { GetIncomingDocumentAssignmentsHandler } from "./query/get-incoming-document-assignments/get-incoming-document-assignments.handler";
import { GetIncomingDocumentAssignmentsByRoutingIdHandler } from "./query/get-incoming-document-assignments-by-routing-id/get-incoming-document-assignments-by-routing-id.handler";
import { GetIncomingDocumentDetailsHandler } from "./query/get-incoming-document-detials/get-incoming-document-detials.handler";
import { GetIncomingDocumentFileStreamHandler } from "./query/get-incoming-file-stream/get-incoming-document-file-stream.handler";
import { GetReceiverQueueDetailsHandler } from "./query/get-receiver-queue-details/get-incoming-document-by-queue.handler";
import { SearchRoutedDivisionHandler } from "./query/search-routed-division/search-routed-division.handler";
import { IncomingDocumentAssignmentCountRepository } from "./repository/incoming-document-assignment-counts.repository";
import { IncomingDocumentAssignmentsReadRepository } from "./repository/incoming-document-assignment-repository/incoming-document-assignment.read.repository";
import { IncomingDocumentAssignmentsWriteRepository } from "./repository/incoming-document-assignment-repository/incoming-document-assignment.write.repository";
import { IncomingDocumentsReadRepository } from "./repository/incoming-document-repository/incoming-document.read.repository";
import { IncomingDocumentsWriteRepository } from "./repository/incoming-document-repository/incoming-document.write.repository";
import { IncomingDocumentRoutingAssignmentCounterRepository } from "./repository/incoming-document-routing-assignment-counter.repository";
import { IncomingDocumentRoutingRepository } from "./repository/incoming-document-routing-repository";
import { AssignmentCounterService } from "./services/assignment-counter.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncomingDocumentEntity,
      IncomingDocumentStatusHistoryEntity,
      IncomingDocumentRoutingEntity,
      IncomingDocumentAssignmentEntity,
      IncomingDocumentAssignmentCountEntity,
      IncomingDocumentRoutingAssignmentCounterEntity,
    ]),

    UserModule,

    DocumentFileModule,
    StorageModule,
    ExtractedDocumentQueueModule,
  ],
  controllers: [IncomingDocumentController, IncomingDocumentRoutingController],
  providers: [
    // Repositories
    IncomingDocumentsReadRepository,
    IncomingDocumentsWriteRepository,
    IncomingDocumentRoutingRepository,
    IncomingDocumentAssignmentsWriteRepository,
    IncomingDocumentAssignmentsReadRepository,
    IncomingDocumentAssignmentCountRepository,
    IncomingDocumentRoutingAssignmentCounterRepository,

    // Service
    AssignmentCounterService,

    // Command handlers
    CreateIncomingDocumentHandler,
    CreateIncomingFromQueueHandler,
    CreateIncomingDocumentAssignmentsHandler,
    AssignIncomingDocumentToDivisionHandler,
    CompleteIncomingDocumentAssignmentHandler,
    DeleteIncomingDocumentAssignmentHandler,

    // Query handlers
    FindIncomingDocumentsHandler,
    GetReceiverQueueDetailsHandler,
    GetIncomingDocumentFileStreamHandler,
    GetAssignedDivisionNoticeCountsHandler,
    GetIncomingDocumentDetailsHandler,
    GetIncomingDocumentAssignmentsByRoutingIdHandler,
    GetIncomingDocumentAssignmentsHandler,
    DeleteIncomingDocumentRoutingHandler,
    SearchRoutedDivisionHandler,
    FindDivisionIncomingDocumentsHandler,
    GetDivisionIncomingDocumentDetailsHandler,
    GetDivisionIncomingDocumentAssignmentsHandler,
  ],
})
export class IncomingDocumentModule {}
