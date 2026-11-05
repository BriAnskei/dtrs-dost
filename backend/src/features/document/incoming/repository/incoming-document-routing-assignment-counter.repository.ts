import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, QueryDeepPartialEntity, Repository } from "typeorm";
import { IncomingDocumentRoutingAssignmentCounterEntity } from "../entities/incoming-document-routing-assignment-counter.entity";
import {
  AssignmentCountChanges,
  AssignmentCountField,
} from "../types/assignment-counter-type";

@Injectable()
export class IncomingDocumentRoutingAssignmentCounterRepository {
  constructor(
    @InjectRepository(IncomingDocumentRoutingAssignmentCounterEntity)
    private readonly repository: Repository<IncomingDocumentRoutingAssignmentCounterEntity>,
  ) {}

  async create(routingId: string, manager: EntityManager): Promise<void> {
    await manager
      .getRepository(IncomingDocumentRoutingAssignmentCounterEntity)
      .insert({ routing_id: routingId });
  }

  async adjustCounts(
    routingId: string,
    changes: AssignmentCountChanges,
    manager: EntityManager,
  ): Promise<boolean> {
    const setValues: QueryDeepPartialEntity<IncomingDocumentRoutingAssignmentCounterEntity> =
      {};

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

    // early retrun true if there is no parameters value to  match the business logic
    if (Object.keys(parameters).length === 0) return true;

    const res = await manager
      .getRepository(IncomingDocumentRoutingAssignmentCounterEntity)
      .createQueryBuilder()
      .update()
      .set(setValues)
      .where("routing_id = :routingId", { routingId })
      .setParameters(parameters)
      .execute();

    return (res.affected ?? 0) > 0;
  }

  async findOneByRoutingId(
    routingId: string,
  ): Promise<IncomingDocumentRoutingAssignmentCounterEntity | null> {
    return this.repository.findOne({
      where: {
        routing_id: routingId,
      },
    });
  }
}
