import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InvalidDocument } from '../entities/invalid-document.entity';
import { IncomingDocumentFile } from '../entities/incoming-document-file.entity';

interface InvalidDocumentResponse {
  id: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  documentFileId: string;
  uploaderId: string;
  uploaderName: string;
  missingFields: string[];
  aiResponse: Record<string, string> | null;
  remarks: string | null;
  isMarkInvalid: boolean;
  createdAt: string;
}

@Controller('invalid-documents')
export class InvalidDocumentsController {
  constructor(
    @InjectRepository(InvalidDocument)
    private readonly invalidDocRepository: Repository<InvalidDocument>,
    @InjectRepository(IncomingDocumentFile)
    private readonly fileRepository: Repository<IncomingDocumentFile>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async listInvalidDocuments(
    @Query('uploaderId') uploaderId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<{
    data: InvalidDocumentResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const query = this.invalidDocRepository
      .createQueryBuilder('invalid_doc')
      .leftJoinAndSelect('invalid_doc.documentFile', 'document_file')
      .where('invalid_doc.isMarkInvalid = :isMarkInvalid', {
        isMarkInvalid: false,
      })
      .orderBy('invalid_doc.createdAt', 'DESC');

    if (uploaderId) {
      query.andWhere('document_file.uploaderId = :uploaderId', { uploaderId });
    }

    const [data, total] = await query
      .skip(offset)
      .take(limitNum)
      .getManyAndCount();

    const uploaderNames = await this.getUploaderNames(
      data
        .map((doc) => doc.documentFile?.uploaderId)
        .filter(Boolean) as string[],
    );

    const formatted: InvalidDocumentResponse[] = data.map((doc) => ({
      id: doc.id,
      fileName:
        doc.documentFile?.name ||
        doc.documentFile?.path?.split('/').pop() ||
        'unknown',
      filePath: doc.documentFile?.path || '',
      fileUrl: doc.documentFile?.path
        ? `/uploads/${doc.documentFile.path.split('/').pop()}`
        : '',
      documentFileId: doc.documentFileId,
      uploaderId: doc.documentFile?.uploaderId || '',
      uploaderName: uploaderNames[doc.documentFile?.uploaderId || ''] || '',
      missingFields: doc.missingFields ? JSON.parse(doc.missingFields) : [],
      aiResponse: doc.aiResponse ? JSON.parse(doc.aiResponse) : null,
      remarks: doc.remarks,
      isMarkInvalid: doc.isMarkInvalid,
      createdAt: doc.createdAt.toISOString(),
    }));

    return {
      data: formatted,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('receiver')
  @HttpCode(HttpStatus.OK)
  async listReceiverInvalidDocuments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<{
    data: InvalidDocumentResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [data, total] = await this.invalidDocRepository
      .createQueryBuilder('invalid_doc')
      .leftJoinAndSelect('invalid_doc.documentFile', 'document_file')
      .orderBy('invalid_doc.createdAt', 'DESC')
      .skip(offset)
      .take(limitNum)
      .getManyAndCount();

    const uploaderNames = await this.getUploaderNames(
      data
        .map((doc) => doc.documentFile?.uploaderId)
        .filter(Boolean) as string[],
    );

    const formatted: InvalidDocumentResponse[] = data.map((doc) => ({
      id: doc.id,
      fileName:
        doc.documentFile?.name ||
        doc.documentFile?.path?.split('/').pop() ||
        'unknown',
      filePath: doc.documentFile?.path || '',
      fileUrl: doc.documentFile?.path
        ? `/uploads/${doc.documentFile.path.split('/').pop()}`
        : '',
      documentFileId: doc.documentFileId,
      uploaderId: doc.documentFile?.uploaderId || '',
      uploaderName: uploaderNames[doc.documentFile?.uploaderId || ''] || '',
      missingFields: doc.missingFields ? JSON.parse(doc.missingFields) : [],
      aiResponse: doc.aiResponse ? JSON.parse(doc.aiResponse) : null,
      remarks: doc.remarks,
      isMarkInvalid: doc.isMarkInvalid,
      createdAt: doc.createdAt.toISOString(),
    }));

    return {
      data: formatted,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Patch(':id/mark-invalid')
  @HttpCode(HttpStatus.OK)
  async markAsInvalid(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    const doc = await this.invalidDocRepository.findOne({ where: { id } });
    if (!doc) {
      return { success: false, message: 'Invalid document not found' };
    }

    doc.isMarkInvalid = true;
    await this.invalidDocRepository.save(doc);

    return { success: true, message: 'Document marked as invalid' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteInvalidDocument(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    const doc = await this.invalidDocRepository.findOne({
      where: { id },
      relations: { documentFile: true },
    });

    if (!doc) {
      throw new NotFoundException('Invalid document not found');
    }

    const documentFileId = doc.documentFileId;
    const filePath = doc.documentFile?.path;

    // Delete the invalid_documents row, and the incoming_document_files row
    // only if no other invalid_documents rows still reference it.
    let shouldDeleteFile = false;

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(InvalidDocument, { id });

      const remainingRefs = await manager.count(InvalidDocument, {
        where: { documentFileId },
      });

      if (remainingRefs === 0) {
        await manager.delete(IncomingDocumentFile, { id: documentFileId });
        shouldDeleteFile = true;
      }
    });

    if (shouldDeleteFile && filePath) {
      try {
        await fs.unlink(path.resolve(filePath));
      } catch (err) {
        // File may already be missing on disk; don't fail the request over it.
        console.error(`Failed to delete file at ${filePath}:`, err);
      }
    }

    return { success: true, message: 'Document deleted' };
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
