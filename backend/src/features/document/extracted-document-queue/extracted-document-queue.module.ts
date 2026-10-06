import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../../storage/storage.module";
import { ExtractionModule } from "../extraction/extraction.module";
import { DocumentFileModule } from "../document-file/document-file.module";
import { ExtractionQueueController } from "./controllers/extracted-document-queue.controller";
import { ExtractedDocumentQueueFacade } from "./facade/extracted-document-queue.facade";
import { ExtractedDocumentQueueEntity } from "./entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueRepository } from "./repository/extracted-document-queue.repository";
import { ExtractedDocumentQueueService } from "./service/extracted-document-queue.service";

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
    ExtractedDocumentQueueFacade,
  ],
})
export class ExtractedDocumentQueueModule {}
