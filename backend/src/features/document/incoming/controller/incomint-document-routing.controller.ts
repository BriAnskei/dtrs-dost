import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { AuthenticatedRequest } from "../../../../auth/authentication/types/authenticated-request";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { StartIncomingDocumentAssignmentCommand } from "../command/start-incoming-document-assignment/start-incoming-document-assignment.command";
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

  @Get("division/:incomingDocumentId/assignments")
  @Roles(Role.Division)
  async getDivisionAssignments(
    @Param("incomingDocumentId", ParseUUIDPipe) incomingDocumentId: string,
    @Query() filters: GetDivisionIncomingDocumentAssignmentsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.queryBus.execute(
      new GetDivisionIncomingDocumentAssignmentsQuery(
        incomingDocumentId,
        req.user.division_id,
        filters,
      ),
    );
  }

  @Patch("assignments/:assignmentId/start")
  @Roles(Role.Division)
  async startAssignment(
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.commandBus.execute(
      new StartIncomingDocumentAssignmentCommand(assignmentId, req.user.division_id),
    );
  }
}
