import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiExtractorController } from './controllers/ai-extractor.controller';
import { DocumentQueueController } from './controllers/document-queue.controller';
import { Role } from './entities/role.entity';
import { IncomingDocuments } from './entities/incoming-documents.entity';
import { InvalidDocument } from './entities/invalid-document.entity';
import { IncomingDocumentFile } from './entities/incoming-document-file.entity';
import { IncomingDocQueue } from './entities/incoming-doc-queue.entity';
import { DocumentRouting } from './entities/document-routing.entity';
import { getDatabaseConfig } from './config/database.config';
import { UploadController } from './controllers/upload.controller';
import { InvalidDocumentsController } from './controllers/invalid-documents.controller';
import { Division } from './entities/division.entity';
import { DivisionsController } from './controllers/divisions.controller';
import { IncomingDocumentsController } from './controllers/incoming-documents.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        console.log('DATABASE_URL:', config.get('DATABASE_URL'));

        return getDatabaseConfig(config);
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forFeature([
      Role,
      IncomingDocumentFile,
      InvalidDocument,
      IncomingDocQueue,
      IncomingDocuments,
      Division,
      DocumentRouting,
    ]),
  ],
  controllers: [
    AppController,
    UploadController,
    InvalidDocumentsController,
    DocumentQueueController,
    AiExtractorController,
    DivisionsController,
    IncomingDocumentsController,
  ],
  providers: [AppService],
})
export class AppModule {}