import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DataSource } from "typeorm";
import { Role } from "../../../../../auth/authorization/enum/roles.enum";
import { OfficeType } from "../../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../../enums/assignment-status.enum";
import { IncomingDocumentAssignmentsRepository } from "../../repository/incoming-document-assignment.repository";
import { CompleteIncomingDocumentAssignmentCommand } from "./complete-incoming-document-assignment.command";

@CommandHandler(CompleteIncomingDocumentAssignmentCommand)
export class CompleteIncomingDocumentAssignmentHandler
  implements ICommandHandler<CompleteIncomingDocumentAssignmentCommand>
{
  constructor(
    private readonly assignmentRepository: IncomingDocumentAssignmentsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(command: CompleteIncomingDocumentAssignmentCommand): Promise<void> {
    const { assignmentId, userId, userRole, dto } = command;

    const MAIN_TYPE_ROLE_ALLOWED = [Role.Admin, Role.SuperAdmin];
    const DIVISION_TYPE_ROLE_ALLOWED = [Role.Division];

    await this.dataSource.transaction(async (manager) => {
      const assignment = await this.assignmentRepository.findForUpdate(
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
      if (
        !(await this.assignmentRepository.complete(
          assignmentId,
          dto.actionTaken.trim(),
          userId,
          manager,
        ))
      ) {
        throw new ConflictException(
          "Incoming document assignment could not be completed.",
        );
      }
    });
  }
}
