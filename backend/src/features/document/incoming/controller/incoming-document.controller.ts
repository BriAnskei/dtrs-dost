import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateIncomingFromQueueCommand } from "../command/ create-incoming-from-queue/ create-incoming-from-queue.command";
import { CreateIncomingDocumentCommand } from "../command/create-incoming-document/create-incoming-document.command";
import { CreateIncomingDocumentDto } from "../dto/create-incoming-document.dto";
import { FindIncomingDocumentsQueryDto } from "../dto/find-incoming-documents-query.dto";
import { FindIncomingDocumentsQuery } from "../query/find-incoming-documents/find-incoming-documents.query";
import { GetReceiverQueueDetailsQuery } from "../query/get-receiver-queue-details/get-receiver-queue-details.query";

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

  @Post("from-queue/:queueId")
  @Roles(Role.Admin, Role.SuperAdmin)
  @Idempotent({
    required: true,
    ttl: "24h",
    lockTtl: "30s",
  })
  async createFromQueue(
    @Param("queueId", ParseUUIDPipe) queueId: string,
    @Body() dto: CreateIncomingDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commandBus.execute(
      new CreateIncomingFromQueueCommand(queueId, dto, req.user.id),
    );
  }

  @Get()
  @Roles(Role.SuperAdmin, Role.Admin)
  findAll(@Query() query: FindIncomingDocumentsQueryDto) {
    return this.queryBus.execute(new FindIncomingDocumentsQuery(query));
  }

  // reciever viewing handler, implemented here to either view, incoming(approved),
  // invalidation reponse(invalidated). it is implemented here to avoid CD
  // see module for queue and incoming for more info.
  @Get("receiver-queue/:queueId")
  getReceiverQueueDetails(@Param("queueId", ParseUUIDPipe) queueId: string) {
    return this.queryBus.execute(new GetReceiverQueueDetailsQuery(queueId));
  }
}
