import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { IncomingDocumentAssignmentEntity } from "../entities/incoming-document-assignment.entity";

@Injectable()
export class IncomingDocumentAssignmentsRepository {
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
}
