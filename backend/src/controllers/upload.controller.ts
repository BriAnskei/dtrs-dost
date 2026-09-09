import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerStorage } from '../config/multer.config';
import { IncomingDocumentFile } from '../entities/incoming-document-file.entity';
import { InvalidDocument } from '../entities/invalid-document.entity';
import { IncomingDocQueue } from '../entities/incoming-doc-queue.entity';

import { DocumentRouting } from '../entities/document-routing.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import * as saveIncomingDocumentDto from '../entities/save-incoming-document.dto';
import { IncomingDocuments } from '../entities/incoming-documents.entity';

interface AiExtractionResult {
  subject: string;
  from: string;
  to: string;
  date_received: string;
}

interface QueueListItem {
  id: string;
  fileName: string;
  from: string;
  uploadedAt: Date;
  status: 'on-queue' | 'received';
}

@Controller('upload')
export class UploadController {
  constructor(
    @InjectRepository(IncomingDocumentFile)
    private readonly fileRepository: Repository<IncomingDocumentFile>,

    @InjectRepository(InvalidDocument)
    private readonly invalidDocRepository: Repository<InvalidDocument>,

    @InjectRepository(IncomingDocQueue)
    private readonly queueRepository: Repository<IncomingDocQueue>,

    @InjectRepository(IncomingDocuments)
    private readonly incomingDocumentsRepository: Repository<IncomingDocuments>,

    private readonly configService: ConfigService,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Post('receiver')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { storage: multerStorage }))
  async uploadReceiverDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('documentText') documentText: string,
    @Body('uploaderId') uploaderId: string,
  ): Promise<{
    success: boolean;
    fileId: string;
    queueId?: string;
    invalidDocId?: string;
    missingFields?: string[];
    message: string;
  }> {
    if (!file) {
      return { success: false, fileId: '', message: 'No file uploaded' };
    }

    if (!uploaderId) {
      return { success: false, fileId: '', message: 'uploaderId is required' };
    }

    // Save incoming_document_files record
    const docFile = this.fileRepository.create({
      id: uuidv4(),
      uploaderId,
      name: file.originalname,
      path: file.path,
    });
    await this.fileRepository.save(docFile);

    // Extract text from document (use client-provided text or empty string)
    const textToAnalyze = documentText || '';

    if (!process.env.GOOGLE_AI_KEY) {
      return {
        success: false,
        fileId: '',
        message: 'GOOGLE_AI_KEY is not configured',
      };
    }

    // Call Google AI Studio for field extraction
    const aiResult = await this.extractFieldsWithAi(textToAnalyze);

    // Determine required fields and check for missing ones
    const requiredFields = ['subject', 'from', 'to', 'date_received'];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = aiResult[field as keyof AiExtractionResult];
      if (!value || value.trim().length === 0) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      // At least one field missing → create invalid_documents record
      const invalidDoc = this.invalidDocRepository.create({
        id: uuidv4(),
        documentFileId: docFile.id,
        missingFields: JSON.stringify(missingFields),
        aiResponse: JSON.stringify(aiResult),
      });
      await this.invalidDocRepository.save(invalidDoc);

      return {
        success: true,
        fileId: docFile.id,
        invalidDocId: invalidDoc.id,
        missingFields,
        message: `Document uploaded with missing fields: ${missingFields.join(', ')}`,
      };
    }

    // All fields present → create incoming_doc_queue record with status 'on_queue'
    const queueEntry = this.queueRepository.create({
      id: uuidv4(),
      documentFileId: docFile.id,
      status: 'on_queue',
    });
    await this.queueRepository.save(queueEntry);

    return {
      success: true,
      fileId: docFile.id,
      queueId: queueEntry.id,
      message: 'Document uploaded and queued for processing',
    };
  }

  @Get('queue')
  @HttpCode(HttpStatus.OK)
  async getQueuedDocuments(): Promise<QueueListItem[]> {
    const entries = await this.queueRepository.find({
      relations: { documentFile: true },
      order: { createdAt: 'DESC' },
    });

    return entries
      .filter((entry) => !!entry.documentFile)
      .map((entry) => ({
        id: entry.id,
        fileName: entry.documentFile.name,
        // TODO: replace with a join to users.Full_name once a User entity/relation exists
        from: entry.documentFile.uploaderId,
        uploadedAt: entry.createdAt,
        status: entry.status === 'on_queue' ? 'on-queue' : 'received',
      }));
  }

  @Post('incomming/save')
  @HttpCode(HttpStatus.CREATED)
  async saveIncomingDocument(
    @Body() body: saveIncomingDocumentDto.SaveIncomingDocumentDto,
  ): Promise<{
    success: boolean;
    incomingDocumentId?: string;
    message: string;
  }> {
    const {
      queueId,
      documentFileId,
      subject,
      from,
      to,
      dateReceived,
      summary,
      routedTo,
      noticeOfAction,
      actionTaken,
    } = body;

    if (!queueId || !documentFileId) {
      throw new BadRequestException('queueId and documentFileId are required');
    }
    if (!routedTo || routedTo.length === 0) {
      throw new BadRequestException(
        'At least one division must be selected in routedTo',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const queueRepo = manager.getRepository(IncomingDocQueue);
      const incomingRepo = manager.getRepository(IncomingDocuments);
      const routingRepo = manager.getRepository(DocumentRouting);

      // 1. Load and update the queue entry
      const queueEntry = await queueRepo.findOne({ where: { id: queueId } });
      if (!queueEntry) {
        throw new NotFoundException(`Queue entry ${queueId} not found`);
      }
      queueEntry.status = 'received';
      await queueRepo.save(queueEntry);

      // 2. Create the incoming_documents record
      const uniqueId = await this.generateUniqueId(
        manager.getRepository(IncomingDocuments),
      );

      const incomingDoc = incomingRepo.create({
        id: uuidv4(),
        documentFileId,
        status: 'pending',
        uniqueId,
        subject: subject || null,
        from: from || null,
        to: to || null,
        dateReceived: dateReceived ? dateReceived.slice(0, 10) : null, // strip time if datetime-local
        summary: summary || null,
        noticeAction: noticeOfAction || null,
        actionTaken: actionTaken || null,
      });
      await incomingRepo.save(incomingDoc);

      // 3. Create document_routing rows, one per division
      const routingRows = routedTo.map((divisionId) =>
        routingRepo.create({
          id: uuidv4(),
          incomingDocumentId: incomingDoc.id,
          divisionId,
        }),
      );
      await routingRepo.save(routingRows);

      return {
        success: true,
        incomingDocumentId: incomingDoc.id,
        message: 'Document saved and routed successfully',
      };
    });
  }

  @Post('incomming/save-invalid')
  @HttpCode(HttpStatus.CREATED)
  async saveInvalidDocument(
    @Body() body: saveIncomingDocumentDto.SaveIncomingDocumentDto & { invalidDocId: string },
  ): Promise<{
    success: boolean;
    incomingDocumentId?: string;
    message: string;
  }> {
    const {
      invalidDocId,
      documentFileId,
      subject,
      from,
      to,
      dateReceived,
      summary,
      routedTo,
      noticeOfAction,
      actionTaken,
    } = body;

    if (!invalidDocId || !documentFileId) {
      throw new BadRequestException('invalidDocId and documentFileId are required');
    }
    if (!routedTo || routedTo.length === 0) {
      throw new BadRequestException(
        'At least one division must be selected in routedTo',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const queueRepo = manager.getRepository(IncomingDocQueue);
      const incomingRepo = manager.getRepository(IncomingDocuments);
      const routingRepo = manager.getRepository(DocumentRouting);
      const invalidDocRepo = manager.getRepository(InvalidDocument);

      // 1. Delete the invalid document record
      const invalidDoc = await invalidDocRepo.findOne({ where: { id: invalidDocId } });
      if (!invalidDoc) {
        throw new NotFoundException(`Invalid document ${invalidDocId} not found`);
      }
      await invalidDocRepo.remove(invalidDoc);

      // 2. Create the incoming_doc_queue entry with status 'received'
      const queueEntry = queueRepo.create({
        id: uuidv4(),
        documentFileId,
        status: 'received',
      });
      await queueRepo.save(queueEntry);

      // 3. Create the incoming_documents record
      const uniqueId = await this.generateUniqueId(incomingRepo);

      const incomingDoc = incomingRepo.create({
        id: uuidv4(),
        documentFileId,
        status: 'pending',
        uniqueId,
        subject: subject || null,
        from: from || null,
        to: to || null,
        dateReceived: dateReceived ? dateReceived.slice(0, 10) : null,
        summary: summary || null,
        noticeAction: noticeOfAction || null,
        actionTaken: actionTaken || null,
      });
      await incomingRepo.save(incomingDoc);

      // 4. Create document_routing rows, one per division
      const routingRows = routedTo.map((divisionId) =>
        routingRepo.create({
          id: uuidv4(),
          incomingDocumentId: incomingDoc.id,
          divisionId,
        }),
      );
      await routingRepo.save(routingRows);

      return {
        success: true,
        incomingDocumentId: incomingDoc.id,
        message: 'Document saved and routed successfully',
      };
    });
  }

  /**
   * Generates a human-readable ID code in the form YYYY-####, where #### is a
   * zero-padded sequential counter of incoming_documents created so far this year.
   */
  private async generateUniqueId(
    repo: Repository<IncomingDocuments>,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const startOfNextYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const countThisYear = await repo
      .createQueryBuilder('doc')
      .where('doc.created_at >= :start AND doc.created_at < :end', {
        start: startOfYear,
        end: startOfNextYear,
      })
      .getCount();

    const sequence = String(countThisYear + 1).padStart(4, '0');
    return `${year}-${sequence}`;
  }

  private async extractFieldsWithAi(text: string): Promise<AiExtractionResult> {
    const apiKey = this.configService.get<string>('GOOGLE_AI_KEY');

    const ai = new GoogleGenAI({
      apiKey,
    });

    const systemInstruction =
      'You are a document extraction assistant. Extract structured metadata from document text. ' +
      'Return ONLY a valid JSON object with no markdown, no explanations, no extra text. ' +
      'Required fields: subject, from, to, date_received. ' +
      'date_received must be in YYYY-MM-DD format. ' +
      'If a field cannot be found in the document, return an empty string for that field.';

    const extractionSchema = {
      type: 'object' as const,
      properties: {
        subject: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
        date_received: { type: 'string' },
        time_received: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['subject', 'from', 'to', 'date_received'],
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: extractionSchema,
        },
        contents: text,
      });

      const candidates = response.text;

      if (!candidates) {
        console.error('No content in AI response');
        return { subject: '', from: '', to: '', date_received: '' };
      }

      const cleaned = candidates.trim();
      const parsed = JSON.parse(cleaned);

      return {
        subject: parsed.subject || '',
        from: parsed.from || '',
        to: parsed.to || '',
        date_received: parsed.date_received || '',
      };
    } catch (error) {
      console.error('AI extraction error:', error);
      return { subject: '', from: '', to: '', date_received: '' };
    }
  }
}
