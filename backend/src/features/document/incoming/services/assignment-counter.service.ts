import { Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { IncomingDocumentAssignmentCountRepository } from "../repository/incoming-document-assignment-counts.repository";
import { IncomingDocumentRoutingAssignmentCounterRepository } from "../repository/incoming-document-routing-assignment-counter.repository";
import { AssignmentCountChanges } from "../types/assignment-counter-type";

@Injectable()
export class AssignmentCounterService {
  constructor(
    private readonly incomingAssignmentCounterRepository: IncomingDocumentAssignmentCountRepository,
    private readonly routingCounterRepository: IncomingDocumentRoutingAssignmentCounterRepository,
  ) {}

  async createIncomingDocumentCount(
    incomingDocumentId: string,
    manager: EntityManager,
  ): Promise<void> {
    await this.incomingAssignmentCounterRepository.create(incomingDocumentId, manager);
  }

  async createRoutingCount(routingId: string, manager: EntityManager): Promise<void> {
    await this.routingCounterRepository.create(routingId, manager);
  }

  async adjustDocumentAssignmentCounts(
    payload: {
      incomingDocumentId: string;
      routingId: string;
      changes: AssignmentCountChanges;
    },
    manager: EntityManager,
  ): Promise<void> {
    const { incomingDocumentId, routingId, changes } = payload;

    if (Object.keys(changes).length === 0) return;

    await Promise.all([
      this.adjustIncomingGlobalCounts(incomingDocumentId, changes, manager),
      this.adjustIncomingRoutingtCounts(routingId, changes, manager),
    ]);
  }

  async adjustIncomingGlobalCounts(
    incomingDocumentId: string,
    changes: AssignmentCountChanges,
    manager: EntityManager,
  ): Promise<void> {
    const result = await this.incomingAssignmentCounterRepository.adjustCounts(
      incomingDocumentId,
      changes,
      manager,
    );

    if (!result) {
      throw new NotFoundException("AssignmentCount does not exist");
    }
  }

  async adjustIncomingRoutingtCounts(
    routingId: string,
    changes: AssignmentCountChanges,
    manager: EntityManager,
  ): Promise<void> {
    const result = await this.routingCounterRepository.adjustCounts(
      routingId,
      changes,
      manager,
    );

    if (!result) {
      throw new NotFoundException("Routing assignment count does not exist");
    }
  }
}
