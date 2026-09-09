import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IncomingDocQueue } from '../entities/incoming-doc-queue.entity';
import { IncomingDocumentFile } from '../entities/incoming-document-file.entity';
import { IncomingDocuments } from '../entities/incoming-documents.entity';

interface QueueDocumentResponse {
  id: string;
  fileId: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  status: string;
  uploaderName: string;
  createdAt: string;
}

@Controller('upload-queue')
export class DocumentQueueController {
  constructor(
    @InjectRepository(IncomingDocQueue)
    private readonly queueRepository: Repository<IncomingDocQueue>,

    @InjectRepository(IncomingDocumentFile)
    private readonly fileRepository: Repository<IncomingDocumentFile>,

    @InjectRepository(IncomingDocuments)
    private readonly incomingDocRepository: Repository<IncomingDocuments>,

    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async listQueue(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<{
    data: QueueDocumentResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const query = this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.documentFile', 'document_file')
      .where('queue.status = :status', { status: 'on_queue' })
      .orderBy('queue.createdAt', 'DESC');

    const [data, total] = await query
      .skip(offset)
      .take(limitNum)
      .getManyAndCount();

    const uploaderNames = await this.getUploaderNames(
      data
        .map((entry) => entry.documentFile?.uploaderId)
        .filter(Boolean) as string[],
    );

    const formatted: QueueDocumentResponse[] = data.map((entry) => ({
      id: entry.id,
      fileId: entry.documentFile?.id || '',
      fileName:
        entry.documentFile?.name ||
        entry.documentFile?.path?.split('/').pop() ||
        'unknown',
      filePath: entry.documentFile?.path || '',
      fileUrl: entry.documentFile?.path
        ? `/uploads/${entry.documentFile.path.split('/').pop()}`
        : '',
      status: entry.status,
      uploaderName: uploaderNames[entry.documentFile?.uploaderId || ''] || '',
      createdAt: entry.createdAt.toISOString(),
    }));

    return {
      data: formatted,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Patch(':id/received')
  @HttpCode(HttpStatus.OK)
  async markAsReceived(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    const entry = await this.queueRepository.findOne({ where: { id } });
    if (!entry) {
      return { success: false, message: 'Queue entry not found' };
    }

    entry.status = 'received';
    await this.queueRepository.save(entry);

    return { success: true, message: 'Queue entry marked as received' };
  }

  private async getUploaderNames(
    uploaderIds: string[],
  ): Promise<Record<string, string>> {
    if (uploaderIds.length === 0) return {};

    const users = await this.dataSource.query(
      `SELECT id, full_name FROM users WHERE id = ANY($1)`,
      [uploaderIds],
    );

    return Object.fromEntries(users.map((u: any) => [u.id, u.full_name]));
  }
}
