import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { AuthenticatedRequest } from "../../../../auth/authentication/types/authenticated-request";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { ParsePdfFilePipe } from "../../pipes/parse-pdf-file-pipe";
import { CreateOutgoingDocumentCommand } from "../commands/create-outgoing-document/create-outgoing-document.command";
import { CreateOutgoingDocumentDto } from "../dto/create-outgoing-document-dto";

@Controller("outgoing-documents")
export class OutgoingDocumentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @Roles(Role.Admin, Role.SuperAdmin)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async create(
    @UploadedFile(ParsePdfFilePipe) file: Express.Multer.File,
    @Body() dto: CreateOutgoingDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commandBus.execute(
      new CreateOutgoingDocumentCommand(dto, file, req.user.id),
    );
  }
}
