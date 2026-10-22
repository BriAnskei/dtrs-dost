import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { Idempotent } from "@nestjs/idempotency";
import { FileInterceptor } from "@nestjs/platform-express";
import { create } from "content-disposition";
import { memoryStorage } from "multer";
import type { AuthenticatedRequest } from "../../../../auth/authentication/types/authenticated-request";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { ParsePdfFilePipe } from "../../../../common/pipes/parse-pdf-file-pipe";
import { CreateExtractedDocumentDto } from "../dto/create-extracted-document-dto";
import { FindExtractedDocumentQueuesQueryDto } from "../dto/find-extracted-document-queues-query.dto";
import { FindMyExtractedDocumentQueuesQueryDto } from "../dto/find-my-extracted-document-queues-query.dto";
import { InvalidateExtractedDocumentQueueDto } from "../dto/invalidate-extracted-document-queue.dto";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";
import { CreateExtractedDocumentQueueUseCase } from "../use-cases/create-extracted-document-queue.usecase";
import { GetDocumentFileStreamUseCase } from "../use-cases/get-document-file-stream.usecase";
import { InvalidateExtractedDocumentQueueUseCase } from "../use-cases/invalidate-extracted-document-queue.usecase";

@Controller("extracted-document-queue")
export class ExtractionQueueController {
  constructor(
    private readonly invalidateQueue: InvalidateExtractedDocumentQueueUseCase,
    private readonly createExtractedDocumentQueue: CreateExtractedDocumentQueueUseCase,
    private readonly getFileSteam: GetDocumentFileStreamUseCase,
    private readonly service: ExtractedDocumentQueueService,
  ) {}

  @Post()
  @Roles(Role.ReceiverOfficer)
  @Idempotent({
    required: true,
    ttl: "24h",
    lockTtl: "30s",
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  create(
    @UploadedFile(ParsePdfFilePipe) file: Express.Multer.File,
    @Body() dto: CreateExtractedDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.createExtractedDocumentQueue.execute(file, dto, req.user.id);
  }

  @Get()
  @Roles(Role.SuperAdmin, Role.Admin)
  async findAll(@Query() query: FindExtractedDocumentQueuesQueryDto) {
    return this.service.findAll(query);
  }

  @Get("my")
  @Roles(Role.ReceiverOfficer)
  async findMyQueues(
    @Req() req: AuthenticatedRequest,
    @Query() query: FindMyExtractedDocumentQueuesQueryDto,
  ) {
    return this.service.findAllByUploaderId(req.user.id, query);
  }

  @Get(":id")
  @Roles(Role.SuperAdmin, Role.Admin)
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/file")
  @Roles(Role.SuperAdmin, Role.Admin)
  async file(@Param("id", ParseUUIDPipe) id: string) {
    const { stream, filename } = await this.getFileSteam.execute(id);

    const disposition = create(filename, { type: "inline" });

    return new StreamableFile(stream, {
      type: "application/pdf",
      disposition,
    });
  }

  @Patch(":id/invalidate")
  @Roles(Role.SuperAdmin, Role.Admin)
  @HttpCode(HttpStatus.OK)
  invalidate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: InvalidateExtractedDocumentQueueDto,
  ) {
    return this.invalidateQueue.execute({
      queueId: id,
      response: dto.response,
    });
  }
}
