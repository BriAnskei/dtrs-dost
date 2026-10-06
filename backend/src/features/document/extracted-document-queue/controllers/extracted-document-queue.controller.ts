import {
  Body,
  Controller,
  Post,
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
import { ExtractedDocumentQueueFacade } from "../facade/extracted-document-queue.facade";

@Controller("extracted-document-queue")
export class ExtractionQueueController {
  constructor(private readonly facade: ExtractedDocumentQueueFacade) {}

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
    return this.facade.receiveDocument(file, dto, req.user.id);
  }
}
