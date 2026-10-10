import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DocumentFileRepository } from "./document-file.repository";
import { DocumentFileService } from "./document-file.service";
import { DocumentFileEntity } from "./entities/document-file.entity";

@Module({
  imports: [TypeOrmModule.forFeature([DocumentFileEntity])],
  providers: [DocumentFileRepository, DocumentFileService],
  exports: [DocumentFileService],
})
export class DocumentFileModule {}
