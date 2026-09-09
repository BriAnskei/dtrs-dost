import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IncomingDocuments } from '../entities/incoming-documents.entity';
import { DocumentRouting } from '../entities/document-routing.entity';
import { IncomingDocumentFile } from '../entities/incoming-document-file.entity';
import { Division } from '../entities/division.entity';

interface IncomingDocumentResponse {
  id: string;
  uniqueId: string | null;
  subject: string | null;
  from: string | null;
  to: string | null;
  dateReceived: string | null;
  noticeAction: string | null;
  actionTaken: string | null;
  remarks: string | null;
  status: 'pending' | 'ongoing' | 'complete';
  documentFileId: string;
  fileName: string;
  fileUrl: string;
  uploaderId: string;
  uploaderName: string;
  routedDivisions: RoutedDivisionResponse[];
  createdAt: string;
}

interface RoutedDivisionResponse {
  id: string;
  divisionId: string;
  divisionName: string;
}

interface StatusUpdateBody {
  status: 'pending' | 'ongoing' | 'complete';
  remarks?: string;
}

interface AddRoutingBody {
  divisionId: string;
}

@Controller('incoming')
export class IncomingDocumentsController {
  constructor(
    @InjectRepository(IncomingDocuments)
    private readonly incomingRepo: Repository<IncomingDocuments>,

    @InjectRepository(DocumentRouting)
    private readonly routingRepo: Repository<DocumentRouting>,

    @InjectRepository(IncomingDocumentFile)
    private readonly fileRepo: Repository<IncomingDocumentFile>,

    @InjectRepository(Division)
    private readonly divisionRepo: Repository<Division>,

    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  // ── List all incoming documents ────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  async listIncomingDocuments(): Promise<IncomingDocumentResponse[]> {
    const docs = await this.incomingRepo.find({
      relations: {
        documentFile: true,
        documentRouting: {
          division: true,
        },
      },
      order: { createdAt: 'DESC' },
    });

    const uploaderIds = docs
      .map((d) => d.documentFile?.uploaderId)
      .filter(Boolean) as string[];
    const uploaderNames = await this.getUploaderNames(uploaderIds);

    return docs.map((doc) => this.formatDocument(doc, uploaderNames));
  }

  // ── Update document status ─────────────────────────────────────────

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: StatusUpdateBody,
  ): Promise<{ success: boolean; message: string }> {
    const doc = await this.incomingRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Incoming document ${id} not found`);
    }

    const statusOrder = { pending: 0, ongoing: 1, complete: 2 };
    const currentOrder = statusOrder[doc.status];
    const newOrder = statusOrder[body.status];
    const isRollback = newOrder < currentOrder;

    if (isRollback && !body.remarks?.trim()) {
      throw new BadRequestException('Remarks are required for status rollback');
    }

    doc.status = body.status;
    if (isRollback && body.remarks?.trim()) {
      doc.remarks = body.remarks.trim();
    }

    await this.incomingRepo.save(doc);

    return {
      success: true,
      message: 'Document status updated successfully',
    };
  }

  // ── Add a routed division ──────────────────────────────────────────

  @Post(':id/routing')
  @HttpCode(HttpStatus.CREATED)
  async addRouting(
    @Param('id') id: string,
    @Body() body: AddRoutingBody,
  ): Promise<{ success: boolean; message: string }> {
    const doc = await this.incomingRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Incoming document ${id} not found`);
    }

    const division = await this.divisionRepo.findOne({
      where: { id: body.divisionId },
    });
    if (!division) {
      throw new NotFoundException(
        `Division ${body.divisionId} not found`,
      );
    }

    // Check if already routed
    const existing = await this.routingRepo.findOne({
      where: {
        incomingDocumentId: id,
        divisionId: body.divisionId,
      },
    });
    if (existing) {
      return {
        success: true,
        message: 'Document is already routed to this division',
      };
    }

    const routing = this.routingRepo.create({
      id: crypto.randomUUID ? crypto.randomUUID() : this.generateUuid(),
      incomingDocumentId: id,
      divisionId: body.divisionId,
    });
    await this.routingRepo.save(routing);

    return {
      success: true,
      message: 'Division added to routing',
    };
  }

  // ── Remove a routed division ───────────────────────────────────────

  @Delete(':id/routing/:divisionId')
  @HttpCode(HttpStatus.OK)
  async removeRouting(
    @Param('id') id: string,
    @Param('divisionId') divisionId: string,
  ): Promise<{ success: boolean; message: string }> {
    const routing = await this.routingRepo.findOne({
      where: {
        incomingDocumentId: id,
        divisionId,
      },
    });

    if (!routing) {
      throw new NotFoundException(
        `Routing entry not found for document ${id} and division ${divisionId}`,
      );
    }

    await this.routingRepo.remove(routing);

    return {
      success: true,
      message: 'Division removed from routing',
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private formatDocument(
    doc: IncomingDocuments,
    uploaderNames: Record<string, string>,
  ): IncomingDocumentResponse {
    return {
      id: doc.id,
      uniqueId: doc.uniqueId,
      subject: doc.subject,
      from: doc.from,
      to: doc.to,
      dateReceived: doc.dateReceived,
      noticeAction: doc.noticeAction,
      actionTaken: doc.actionTaken,
      remarks: doc.remarks,
      status: doc.status,
      documentFileId: doc.documentFileId,
      fileName: doc.documentFile?.name || '',
      fileUrl: doc.documentFile?.path
        ? `/uploads/${doc.documentFile.path.split('/').pop()}`
        : '',
      uploaderId: doc.documentFile?.uploaderId || '',
      uploaderName:
        uploaderNames[doc.documentFile?.uploaderId || ''] || '',
      routedDivisions: (doc.documentRouting || []).map((r) => ({
        id: r.id,
        divisionId: r.divisionId,
        divisionName: r.division?.division_name || '',
      })),
      createdAt: doc.createdAt.toISOString(),
    };
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

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }
}
