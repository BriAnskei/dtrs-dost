import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../../storage/storage.module";
import { DocumentFileModule } from "../document-file/document-file.module";
import { ExtractionModule } from "../extraction/extraction.module";
import { ExtractionQueueController } from "./controllers/extracted-document-queue.controller";
import { ExtractedDocumentQueueEntity } from "./entities/extracted-document-queue.entity";
import { InvalidationResponseEntity } from "./entities/invalidation-response.entity";
import { ExtractedDocumentQueueRepository } from "./repository/extracted-document-queue.repository";
import { InvalidationResponseRepository } from "./repository/invalidation-response.repository";
import { ExtractedDocumentQueueService } from "./service/extracted-document-queue.service";
import { CreateExtractedDocumentQueueUseCase } from "./use-cases/create-extracted-document-queue.usecase";
import { DeleteExtractedDocumentQueueUseCase } from "./use-cases/delete-extracted-document-queue.usecase";
import { GetDocumentFileStreamUseCase } from "./use-cases/get-document-file-stream.usecase";
import { InvalidateExtractedDocumentQueueUseCase } from "./use-cases/invalidate-extracted-document-queue.usecase";

@Module({
  imports: [
    TypeOrmModule.forFeature([ExtractedDocumentQueueEntity, InvalidationResponseEntity]),
    ExtractionModule,
    DocumentFileModule,
    StorageModule,
  ],
  controllers: [ExtractionQueueController],
  providers: [
    ExtractedDocumentQueueRepository,
    ExtractedDocumentQueueService,
    CreateExtractedDocumentQueueUseCase,
    GetDocumentFileStreamUseCase,

    InvalidationResponseRepository,
    InvalidateExtractedDocumentQueueUseCase,

    DeleteExtractedDocumentQueueUseCase,
  ],
  exports: [ExtractedDocumentQueueService, InvalidationResponseRepository],
})
export class ExtractedDocumentQueueModule {}
