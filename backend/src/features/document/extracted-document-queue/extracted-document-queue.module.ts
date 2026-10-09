import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../../storage/storage.module";
import { DocumentFileModule } from "../document-file/document-file.module";
import { ExtractionModule } from "../extraction/extraction.module";
import { ExtractionQueueController } from "./controllers/extracted-document-queue.controller";
import { ExtractedDocumentQueueEntity } from "./entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueRepository } from "./repository/extracted-document-queue.repository";
import { ExtractedDocumentQueueService } from "./service/extracted-document-queue.service";
import { ExtractedDocumentQueueUseCase } from "./use-cases/extracted-document-queue.usecase";

@Module({
  imports: [
    TypeOrmModule.forFeature([ExtractedDocumentQueueEntity]),
    ExtractionModule,
    DocumentFileModule,
    StorageModule,
  ],
  controllers: [ExtractionQueueController],
  providers: [
    ExtractedDocumentQueueRepository,
    ExtractedDocumentQueueService,
    ExtractedDocumentQueueUseCase,
  ],
})
export class ExtractedDocumentQueueModule {}
