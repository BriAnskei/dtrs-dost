import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../../../storage/storage.module";
import { ExtractedDocumentQueueModule } from "../extracted-document-queue/extracted-document-queue.module";
import { DocumentFileController } from "./controller/document-file.controller";
import { DocumentFileEntity } from "./entities/document-file.entity";
import { DocumentFileRepository } from "./repository/document-file.repository";
import { DocumentFileService } from "./service/document-file.service";
import { GetDocumentFileUseCase } from "./usecase/get-document-file.usecase";

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentFileEntity]),
    ExtractedDocumentQueueModule,
    StorageModule,
  ],
  controllers: [DocumentFileController],
  providers: [DocumentFileRepository, DocumentFileService, GetDocumentFileUseCase],
  exports: [DocumentFileService],
})
export class DocumentFileModule {}
