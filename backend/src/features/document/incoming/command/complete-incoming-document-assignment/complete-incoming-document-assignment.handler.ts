import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource, EntityManager } from "typeorm";
import { Role } from "../../../../../auth/authorization/enum/roles.enum";
import {
  IncomingDocumentAssignmentEntity,
  OfficeType,
} from "../../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../../enums/assignment-status.enum";
import { IncomingDocumentAssignmentsWriteRepository } from "../../repository/incoming-document-assignment-repository/incoming-document-assignment.write.repository";
import { IncomingDocumentRoutingRepository } from "../../repository/incoming-document-routing-repository";
import { AssignmentCounterService } from "../../services/assignment-counter.service";
import { CompleteIncomingDocumentAssignmentCommand } from "./complete-incoming-document-assignment.command";

@CommandHandler(CompleteIncomingDocumentAssignmentCommand)
export class CompleteIncomingDocumentAssignmentHandler
  implements ICommandHandler<CompleteIncomingDocumentAssignmentCommand>
{
  constructor(
    private readonly assignmentWriteRepository: IncomingDocumentAssignmentsWriteRepository,
    private readonly routingRepository: IncomingDocumentRoutingRepository,
    private readonly counterService: AssignmentCounterService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(command: CompleteIncomingDocumentAssignmentCommand): Promise<void> {
    const { assignmentId, userId, userRole, dto } = command;

    const MAIN_TYPE_ROLE_ALLOWED = [Role.Admin, Role.SuperAdmin];
    const DIVISION_TYPE_ROLE_ALLOWED = [Role.Division];

    await this.dataSource.transaction(async (manager) => {
      const assignment = await this.assignmentWriteRepository.findForUpdate(
        assignmentId,
        manager,
      );

      if (!assignment) {
        throw new NotFoundException("Incoming document assignment not found.");
      }

      if (
        assignment.office_type === OfficeType.MAIN &&
        !MAIN_TYPE_ROLE_ALLOWED.includes(userRole)
      ) {
        throw new ForbiddenException(
          "You are not allowed to complete main office assignments.",
        );
      }

      if (
        assignment.office_type === OfficeType.DIVISION &&
        !DIVISION_TYPE_ROLE_ALLOWED.includes(userRole)
      ) {
        throw new ForbiddenException(
          "You are not allowed to complete division assignments.",
        );
      }

      if (
        ![AssignmentStatus.PENDING, AssignmentStatus.ONGOING].includes(assignment.status)
      ) {
        throw new ConflictException("Incoming document assignment cannot be completed.");
      }

      const res = await this.assignmentWriteRepository.complete(
        assignmentId,
        dto.actionTaken.trim(),
        userId,
        manager,
      );

      if (!res)
        throw new ConflictException(
          "Incoming document assignment could not be completed.",
        );

      // The assignment just transitioned PENDING/ONGOING -> COMPLETE, so the
      // "active" bucket drops by one and the "completed" bucket grows by one.
      // `total` is unchanged: the assignment still exists, only its status moved.
      await this.adjustCompletionCounts(assignment, manager);
    });
  }

  /**
   * Resolves the routing id for a division assignment (same lookup the delete
   * handler uses) and applies the status-transition delta to both counters.
   *
   * MAIN assignments have no routing, so only the global counter is updated.
   */
  private async adjustCompletionCounts(
    assignment: IncomingDocumentAssignmentEntity,
    manager: EntityManager,
  ): Promise<void> {
    // PENDING/ONGOING -> COMPLETE: moves one unit out of `ongoing` into
    // `complete`. `total` is unchanged, the assignment still exists.
    const changes = this.counterService.statusTransitionChanges(
      assignment.status,
      AssignmentStatus.COMPLETE,
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
    manager: EntityManager,
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
