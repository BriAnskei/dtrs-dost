import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { AuthenticatedRequest } from "../../../../auth/authentication/types/authenticated-request";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { CreateExtractedDocumentDto } from "../dto/create-extracted-document-dto";
import { FindExtractedDocumentQueuesQueryDto } from "../dto/find-extracted-document-queues-query.dto";
import { FindMyExtractedDocumentQueuesQueryDto } from "../dto/find-my-extracted-document-queues-query.dto";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";
import { ExtractedDocumentQueueUseCase } from "../use-cases/extracted-document-queue.usecase";

@Controller("extracted-document-queue")
export class ExtractionQueueController {
  constructor(
    private readonly usecase: ExtractedDocumentQueueUseCase,
    private readonly service: ExtractedDocumentQueueService,
  ) {}

  @Post()
  @Roles(Role.ReceiverOfficer)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateExtractedDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usecase.receiveDocument(file, dto, req.user.id);
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
}
