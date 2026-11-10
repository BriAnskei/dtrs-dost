import { Controller, Get, Query, Req } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { AuthenticatedRequest } from "../../../../auth/authentication/types/authenticated-request";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { FindDivisionIncomingDocumentsQueryDto } from "../dto/find-division-incoming-documents-query.dto";
import { FindDivisionIncomingDocumentsQuery } from "../query/find-division-incoming-documents/find-division-incoming-documents.query";

@Controller("incoming-document-routing")
export class IncomingDocumentRoutingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get("division")
  @Roles(Role.Division)
  findAllByDivision(
    @Req() req: AuthenticatedRequest,
    @Query() query: FindDivisionIncomingDocumentsQueryDto,
  ) {
    return this.queryBus.execute(
      new FindDivisionIncomingDocumentsQuery(req.user.id, query),
    );
  }
}
