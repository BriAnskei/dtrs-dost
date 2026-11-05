import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, QueryDeepPartialEntity, Repository } from "typeorm";
import { IncomingDocumentAssignmentCountEntity } from "../entities/incoming-document-assignment-count.entity";
import {
  AssignmentCountChanges,
  AssignmentCountField,
} from "../types/assignment-counter-type";

@Injectable()
export class IncomingDocumentAssignmentCountRepository {
  constructor(
    @InjectRepository(IncomingDocumentAssignmentCountEntity)
    private readonly repository: Repository<IncomingDocumentAssignmentCountEntity>,
  ) {}

  async create(incomingDocumentId: string, manager: EntityManager): Promise<void> {
    await manager.getRepository(IncomingDocumentAssignmentCountEntity).insert({
      incoming_document_id: incomingDocumentId,
    });
  }

  async findOneByIncomingDocumentId(
    incomingDocumentId: string,
  ): Promise<IncomingDocumentAssignmentCountEntity | null> {
    return this.repository.findOne({
      where: {
        incoming_document_id: incomingDocumentId,
      },
    });
  }

  async adjustCounts(
    incomingDocumentId: string,
    changes: AssignmentCountChanges,
    manager: EntityManager,
  ): Promise<boolean> {
    const setValues: QueryDeepPartialEntity<IncomingDocumentAssignmentCountEntity> = {};

    const parameters: Record<string, number> = {};

    for (const [field, amount] of Object.entries(changes) as [
      AssignmentCountField,
      number,
    ][]) {
      if (amount === 0) continue;

      if (!Number.isSafeInteger(amount)) {
        throw new Error(`Invalid counter adjustment for ${field}`);
      }

      Object.assign(setValues, {
        [field]: () => `"${field}" + :${field}`,
      });

      parameters[field] = amount;
    }

    // No value to be updated thus we return true to match the business logic
    if (Object.keys(parameters).length === 0) return true;

    const res = await manager
      .getRepository(IncomingDocumentAssignmentCountEntity)
      .createQueryBuilder()
      .update()
      .set(setValues)
      .where("incoming_document_id = :incomingDocumentId", {
        incomingDocumentId,
      })
      .setParameters(parameters)
      .execute();

    return (res.affected ?? 0) > 0;
  }
}
