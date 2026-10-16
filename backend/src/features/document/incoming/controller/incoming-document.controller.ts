import {
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
import { ParsePdfFilePipe } from "../../../../common/pipes/parse-pdf-file-pipe";
import { CreateIncomingDocumentCommand } from "../command/create-incoming-document/create-incoming-document.command";
import { CreateIncomingDocumentDto } from "../dto/create-incoming-document.dto";

@Controller("incoming-documents")
export class IncomingDocumentController {
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
    @Body() dto: CreateIncomingDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commandBus.execute(
      new CreateIncomingDocumentCommand(dto, file, req.user.id),
    );
  }
}
