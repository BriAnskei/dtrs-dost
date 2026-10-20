import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
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
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";
import { CreateExtractedDocumentQueueUseCase } from "../use-cases/create-extracted-document-queue.usecase";
import { GetDocumentFileStreamUseCase } from "../use-cases/get-document-file-stream.usecase";

@Controller("extracted-document-queue")
export class ExtractionQueueController {
  constructor(
    private readonly createExtractedDocumentQueue: CreateExtractedDocumentQueueUseCase,
    private readonly getFileSteam: GetDocumentFileStreamUseCase,
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
}
