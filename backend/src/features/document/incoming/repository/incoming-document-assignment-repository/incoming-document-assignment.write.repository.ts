import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { IncomingDocumentAssignmentEntity } from "../../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../../enums/assignment-status.enum";

@Injectable()
export class IncomingDocumentAssignmentsWriteRepository {
  constructor(
    @InjectRepository(IncomingDocumentAssignmentEntity)
    private readonly repository: Repository<IncomingDocumentAssignmentEntity>,
  ) {}

  async insertMany(
    assignments: Partial<IncomingDocumentAssignmentEntity>[],
    manager: EntityManager,
  ): Promise<void> {
    if (assignments.length === 0) {
      return;
    }

    await manager.getRepository(IncomingDocumentAssignmentEntity).insert(assignments);
  }

  async findForUpdate(
    assignmentId: string,
    manager: EntityManager,
  ): Promise<IncomingDocumentAssignmentEntity | null> {
    return manager
      .getRepository(IncomingDocumentAssignmentEntity)
      .createQueryBuilder("assignment")
      .setLock("pessimistic_write")
      .where("assignment.id = :assignmentId", { assignmentId })
      .getOne();
  }

  async complete(
    assignmentId: string,
    actionTaken: string,
    actionTakenById: string,
    manager: EntityManager,
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(IncomingDocumentAssignmentEntity)
      .set({
        status: AssignmentStatus.COMPLETE,
        action_taken: actionTaken,
        action_taken_at: () => "CURRENT_TIMESTAMP",
        action_taken_by_id: actionTakenById,
      })
      .where("id = :assignmentId", { assignmentId })
      .andWhere("status IN (:...statuses)", {
        statuses: [AssignmentStatus.PENDING, AssignmentStatus.ONGOING],
      })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo =
      manager?.getRepository(IncomingDocumentAssignmentEntity) ?? this.repository;

    const res = await repo.delete(id);

    return (res.affected ?? 0) > 0;
  }
}
