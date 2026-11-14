import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";
import {
  IncomingDocumentAssignmentEntity,
  OfficeType,
} from "../../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../../enums/assignment-status.enum";
import { IncomingDocumentAssignmentsReadRepository } from "../../repository/incoming-document-assignment-repository/incoming-document-assignment.read.repository";
import { IncomingDocumentAssignmentsWriteRepository } from "../../repository/incoming-document-assignment-repository/incoming-document-assignment.write.repository";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { AssignmentCounterService } from "../../services/assignment-counter.service";
import { StartIncomingDocumentAssignmentCommand } from "./start-incoming-document-assignment.command";

@CommandHandler(StartIncomingDocumentAssignmentCommand)
@Injectable()
export class StartIncomingDocumentAssignmentHandler
  implements ICommandHandler<StartIncomingDocumentAssignmentCommand>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly readRepository: IncomingDocumentAssignmentsReadRepository,
    private readonly writeRepository: IncomingDocumentAssignmentsWriteRepository,
    private readonly routingRepository: IncomingDocumentRoutingRepository,
    private readonly counterService: AssignmentCounterService,
  ) {}

  async execute(command: StartIncomingDocumentAssignmentCommand): Promise<void> {
    const { assignmentId, divisionId } = command;

    return await this.dataSource.transaction(async (manager) => {
      if (!divisionId) {
        throw new ForbiddenException("Only division users can perform this action.");
      }

      const assignment = await this.readRepository.findById(assignmentId, manager);

      if (!assignment) {
        throw new NotFoundException(
          "Assignment does not exist. Please refresh the page and try again.",
        );
      }

      if (assignment.status !== AssignmentStatus.PENDING) {
        throw new ConflictException(
          `Cannot start assignment. Its current status is ${assignment.status}.`,
        );
      }

      const hasOngoingAssignment =
        await this.readRepository.existsOngoingDivisionAssignment(
          assignment.incoming_document_id,
          divisionId,
          manager,
        );

      if (hasOngoingAssignment) {
        throw new ConflictException(
          "This division already has an ongoing assignment for this document. Complete the existing assignment before starting another one.",
        );
      }

      const wasUpdated = await this.writeRepository.updatePendingToOngoing(
        assignmentId,
        manager,
      );

      if (!wasUpdated) {
        throw new ConflictException(
          "Unable to start assignment. Its status may have changed. Please refresh the page and try again.",
        );
      }

      await this.dataSource.transaction((manager) =>
        this.adjustCounters(assignment, manager),
      );
    });
  }

  /**
   * PENDING -> ONGOING is a status transition, so the delta is derived through
   * `statusTransitionChanges` rather than hand-rolled, keeping this handler
   * consistent with complete/delete. Both statuses are "active", so the delta
   * is currently empty, but the shared helper keeps it correct if the bucket
   * semantics ever change.
   *
   * Division assignments belong to a routing, so the routing counter is
   * updated alongside the global one; MAIN assignments have no routing.
   */
  private async adjustCounters(
    assignment: IncomingDocumentAssignmentEntity,
    manager: import("typeorm").EntityManager,
  ): Promise<void> {
    const changes = this.counterService.statusTransitionChanges(
      assignment.status,
      AssignmentStatus.ONGOING,
    );

    const routingId = await this.resolveRoutingId(assignment, manager);

    if (routingId) {
      await this.counterService.adjustIncomingRoutingtCounts(routingId, changes, manager);
    }

    await this.counterService.adjustIncomingGlobalCounts(
      assignment.incoming_document_id,
      changes,
      manager,
    );
  }

  private async resolveRoutingId(
    assignment: IncomingDocumentAssignmentEntity,
    manager: import("typeorm").EntityManager,
  ): Promise<string | null> {
    if (assignment.office_type !== OfficeType.DIVISION || !assignment.division_id) {
      return null;
    }

    const routing = await this.routingRepository.findByIncomingDocumentAndDivision(
      assignment.incoming_document_id,
      assignment.division_id,
      manager,
    );

    return routing?.id ?? null;
  }
}
