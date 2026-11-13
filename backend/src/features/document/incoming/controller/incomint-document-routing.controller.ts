import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { AuthenticatedRequest } from "../../../../auth/authentication/types/authenticated-request";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { FindDivisionIncomingDocumentsQueryDto } from "../dto/find-division-incoming-documents-query.dto";
import { GetDivisionIncomingDocumentAssignmentsDto } from "../dto/get-division-incoming-document-assignments.dto";
import { RoutedIncomingDocumentDetailsDto } from "../dto/get-division-incoming-document-details-dto";

import { FindDivisionIncomingDocumentsQuery } from "../query/find-division-incoming-documents/find-division-incoming-documents.query";
import { GetDivisionIncomingDocumentAssignmentsQuery } from "../query/get-division-incoming-document-assignments/get-division-incoming-document-assignments.query";
import { GetDivisionIncomingDocumentDetailsQuery } from "../query/get-division-incoming-document-details/get-division-incoming-document-details.query";

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
      new FindDivisionIncomingDocumentsQuery(req.user.division_id, query),
    );
  }

  @Get(":incomingDocumentId/division/details")
  @Roles(Role.Division)
  async getDivisionIncomingDocumentDetails(
    @Req() req: AuthenticatedRequest,
    @Param("incomingDocumentId", ParseUUIDPipe)
    incomingDocumentId: string,
  ): Promise<RoutedIncomingDocumentDetailsDto> {
    return this.queryBus.execute(
      new GetDivisionIncomingDocumentDetailsQuery(
        incomingDocumentId,
        req.user.division_id,
      ),
    );
  }

  @Get("division/assignments")
  @Roles(Role.Division)
  async getDivisionAssignments(
    @Query() filters: GetDivisionIncomingDocumentAssignmentsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.queryBus.execute(
      new GetDivisionIncomingDocumentAssignmentsQuery(req.user.division_id, filters),
    );
  }
}
