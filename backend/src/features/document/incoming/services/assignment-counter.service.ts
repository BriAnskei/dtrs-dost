import { Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { AssignmentStatus } from "../enums/assignment-status.enum";
import { IncomingDocumentAssignmentCountRepository } from "../repository/incoming-document-assignment-counts.repository";
import { IncomingDocumentRoutingAssignmentCounterRepository } from "../repository/incoming-document-routing-assignment-counter.repository";
import { AssignmentCountChanges, AssignmentCountField } from "../types/assignment-counter-type";

/**
 * Counter field semantics
 * -----------------------
 * Each counter row tracks three buckets over its set of assignments:
 *
 *   total    - every assignment, regardless of status
 *   ongoing  - assignments that are NOT yet complete
 *              (status PENDING or ONGOING)
 *   complete - assignments with status COMPLETE
 *
 * Invariant: `total == ongoing + complete`. Every write path below preserves
 * it, so the three fields always reflect the real status distribution.
 *
 * Status -> bucket
 * ----------------
 * PENDING  -> ongoing   division assignments start here. A future "ongoing"
 *                        mutation handler will flip PENDING -> ONGOING, which is
 *                        a NO-OP for the counters: both statuses are active.
 * ONGOING  -> ongoing   MAIN assignments are created directly in ONGOING.
 * COMPLETE -> complete
 *
 * Status-transition deltas
 * -----------------------
 * To keep the invariant intact, a transition only ever moves a count between
 * the `ongoing` and `complete` buckets; `total` only changes when an assignment
 * is created or deleted:
 *
 *   create              -> total +1, ongoing +1
 *   active -> complete   -> ongoing -1, complete +1   (complete action)
 *   active -> deleted    -> total -1, ongoing -1        (delete assignment)
 *   complete -> deleted  -> total -1, complete -1       (delete completed)
 *
 * Use `statusTransitionChanges()` to derive the delta for any status mutation
 * instead of hand-rolling it in each handler.
 */
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

  /**
   * Returns the counter bucket a status contributes to, or null for statuses
   * that are not tracked (e.g. a deleted row's pre-delete status is handled by
   * the caller via total/ongoing/complete deltas directly).
   */
  static bucketOf(status: AssignmentStatus): AssignmentCountField | null {
    switch (status) {
      case AssignmentStatus.PENDING:
      case AssignmentStatus.ONGOING:
        return "ongoing";
      case AssignmentStatus.COMPLETE:
        return "complete";
      default:
        return null;
    }
  }

  /**
   * Delta for removing an assignment that currently has `status`. `total` is
   * always decremented separately by the caller; this only removes the
   * assignment from its bucket (PENDING/ONGING -> ongoing, COMPLETE -> complete).
   */
  unassignChanges(status: AssignmentStatus): AssignmentCountChanges {
    const bucket = AssignmentCounterService.bucketOf(status);
    return bucket ? { [bucket]: -1 } : {};
  }

  /**
   * Builds the counter delta for a single assignment status transition.
   *
   * `from` is the previous status, `to` the new status. The assignment moves
   * out of one bucket and into another, so the net `total` is unchanged. Call
   * this from any handler that mutates an assignment's status (complete, or a
   * future PENDING -> ONGOING transition) instead of hand-rolling the delta.
   *
   * Both directions are covered:
   *   active -> complete -> { ongoing: -1, complete: +1 }
   *   complete -> active -> { ongoing: +1, complete: -1 }
   */
  statusTransitionChanges(
    from: AssignmentStatus,
    to: AssignmentStatus,
  ): AssignmentCountChanges {
    const delta: AssignmentCountChanges = {};
    const fromBucket = AssignmentCounterService.bucketOf(from);
    const toBucket = AssignmentCounterService.bucketOf(to);

    if (fromBucket) {
      delta[fromBucket] = (delta[fromBucket] ?? 0) - 1;
    }
    if (toBucket) {
      delta[toBucket] = (delta[toBucket] ?? 0) + 1;
    }

    return delta;
  }
}
