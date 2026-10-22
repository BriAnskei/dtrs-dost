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
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Idempotent } from "@nestjs/idempotency";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { AuthenticatedRequest } from "../../../../auth/authentication/types/authenticated-request";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { ParsePdfFilePipe } from "../../../../common/pipes/parse-pdf-file-pipe";
import { CreateIncomingDocumentCommand } from "../command/create-incoming-document/create-incoming-document.command";
import { CreateIncomingDocumentDto } from "../dto/create-incoming-document.dto";
import { FindIncomingDocumentsQueryDto } from "../dto/find-incoming-documents-query.dto";
import { FindIncomingDocumentsQuery } from "../query/find-incoming-documents/find-incoming-documents.query";

@Controller("incoming-documents")
export class IncomingDocumentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles(Role.Admin, Role.SuperAdmin)
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
  async create(
    @UploadedFile(ParsePdfFilePipe) file: Express.Multer.File,
    @Body() dto: CreateIncomingDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commandBus.execute(
      new CreateIncomingDocumentCommand(dto, file, req.user.id),
    );
  }

  @Get()
  @Roles(Role.SuperAdmin, Role.Admin)
  findAll(@Query() query: FindIncomingDocumentsQueryDto) {
    return this.queryBus.execute(new FindIncomingDocumentsQuery(query));
  }
}
