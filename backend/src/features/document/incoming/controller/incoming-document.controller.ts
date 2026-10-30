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
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Idempotent } from "@nestjs/idempotency";
import { FileInterceptor } from "@nestjs/platform-express";
import { create } from "content-disposition";
import { memoryStorage } from "multer";
import type { AuthenticatedRequest } from "../../../../auth/authentication/types/authenticated-request";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { ParsePdfFilePipe } from "../../../../common/pipes/parse-pdf-file-pipe";
import { AssignIncomingDocumentToDivisionCommand } from "../command/assign-incoming-document-to-division/assign-incoming-document-to-division.command";
import { CreateIncomingDocumentCommand } from "../command/create-incoming-document/create-incoming-document.command";
import { CreateIncomingFromQueueCommand } from "../command/create-incoming-from-queue/ create-incoming-from-queue.command";
import { AssignIncomingDocumentToDivisionDto } from "../dto/assign-incoming-document-to-division";
import { CreateIncomingDocumentDto } from "../dto/create-incoming-document.dto";
import { FindIncomingDocumentsQueryDto } from "../dto/find-incoming-documents-query.dto";
import { IncomingDocumentDetailsDto } from "../dto/incoming-document-details.dto";
import { FindIncomingDocumentsQuery } from "../query/find-incoming-documents/find-incoming-documents.query";
import { GetAssignedDivisionNoticeCountsQuery } from "../query/get-assigned-division-notice-counts/get-assigned-division-notice-counts.query";
import { GetIncomingDocumentAssignmentsByRoutingIdQuery } from "../query/get-incoming-document-assignments-by-routing-id/get-incoming-document-assignments-by-routing-id.query";
import { GetIncomingDocumentDetailsQuery } from "../query/get-incoming-document-detials/get-incoming-document-details.query";
import { GetIncomingDocumentFileStreamQuery } from "../query/get-incoming-file-stream/get-incoming-document-file-stream.query";
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

  @Get(":id/file")
  @Roles(Role.SuperAdmin, Role.Admin)
  async file(@Param("id", ParseUUIDPipe) id: string) {
    const { stream, filename } = await this.queryBus.execute(
      new GetIncomingDocumentFileStreamQuery(id),
    );

    return new StreamableFile(stream, {
      type: "application/pdf",
      disposition: create(filename, { type: "inline" }),
    });
  }

  @Get(":incomingDocumentId/assigned-division-notice-counts")
  @Roles(Role.Admin, Role.SuperAdmin)
  async getAssignedDivisionNoticeCounts(
    @Param("incomingDocumentId", ParseUUIDPipe) incomingDocumentId: string,
  ) {
    return this.queryBus.execute(
      new GetAssignedDivisionNoticeCountsQuery(incomingDocumentId),
    );
  }

  @Get(":id")
  @Roles(Role.Admin, Role.SuperAdmin)
  async findById(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<IncomingDocumentDetailsDto> {
    return this.queryBus.execute(new GetIncomingDocumentDetailsQuery(id));
  }

  @Post("assign-to-division")
  @Roles(Role.Admin, Role.SuperAdmin)
  assignToDivision(
    @Body() dto: AssignIncomingDocumentToDivisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commandBus.execute(
      new AssignIncomingDocumentToDivisionCommand(dto, req.user.id),
    );
  }

  @Get(":routingId/assignments")
  getAssignmentsByRoutingId(@Param("routingId", ParseUUIDPipe) routingId: string) {
    return this.queryBus.execute(
      new GetIncomingDocumentAssignmentsByRoutingIdQuery(routingId),
    );
  }
}
