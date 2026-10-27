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
import { CreateOutgoingDocumentCommand } from "../commands/create-outgoing-document/create-outgoing-document.command";
import { CreateOutgoingDocumentDto } from "../dto/create-outgoing-document-dto";
import { FindOutgoingDocumentsQueryDto } from "../dto/find-outgoing-documents-query.dto";
import { FindOutgoingDocumentsQuery } from "../queries/handlers/find-outgoing-documents.query";

@Controller("outgoing-documents")
export class OutgoingDocumentController {
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
    @Body() dto: CreateOutgoingDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commandBus.execute(
      new CreateOutgoingDocumentCommand(dto, file, req.user.id),
    );
  }

  @Get()
  @Roles(Role.SuperAdmin, Role.Admin)
  findAll(@Query() query: FindOutgoingDocumentsQueryDto) {
    return this.queryBus.execute(new FindOutgoingDocumentsQuery(query));
  }
}
