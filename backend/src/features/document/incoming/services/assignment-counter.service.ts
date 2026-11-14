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
 *              (PENDING, ONGOING, or COMPLETE)
 *   ongoing  - assignments that have been started, i.e. status ONGOING.
 *              PENDING assignments are NOT counted here yet.
 *   complete - assignments with status COMPLETE
 *
 * Note: there is no invariant tying the three together. A PENDING assignment
 * lives in `total` only, so `total` may be greater than `ongoing + complete`.
 *
 * Status -> bucket
 * ----------------
 * PENDING  -> (none)   division assignments start here. They only touch
 *                      `total` until a division user starts them.
 * ONGOING  -> ongoing  MAIN assignments are created directly in ONGOING.
 * COMPLETE -> complete
 *
 * Assignment lifecycle deltas
 * --------------------------
 *   create MAIN (ONGOING)      -> total +1, ongoing +1
 *   create DIVISION (PENDING)   -> total +1
 *   start (PENDING -> ONGOING)  -> ongoing +1
 *   complete (ONGOING -> COMPLETE)-> ongoing -1, complete +1
 *   delete PENDING              -> total -1
 *   delete ONGOING              -> total -1, ongoing -1
 *   delete COMPLETE             -> blocked upstream (complete guard)
 *
 * Use the static helpers below to derive the delta for any mutation
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

  /**
   * Adjusts both the global (per-document) and routing (per-division) counters
   * atomically. Use this for mutations that affect both counters (create, complete, delete).
   */
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

  /* ──────────────────────────────────────────────────────────────
   * Static helpers – pure counter-delta builders
   * ────────────────────────────────────────────────────────────── */

  /**
   * Returns the counter bucket a status contributes to, or null for statuses
   * that are not tracked (e.g. a deleted row's pre-delete status is handled by
   * the caller via total/ongoing/complete deltas directly).
   */
  static bucketOf(status: AssignmentStatus): AssignmentCountField | null {
    switch (status) {
      case AssignmentStatus.ONGOING:
        return "ongoing";
      case AssignmentStatus.COMPLETE:
        return "complete";
      default:
        return null;
    }
  }

  /**
   * Delta for creating N new assignments. `total` always grows by `count`.
   * `ongoing` only grows when the assignments are born in ONGOING (MAIN);
   * DIVISION assignments are created in PENDING, which is not tracked as
   * ongoing until a division user starts them.
   */
  static createAssignmentChanges(
    count: number,
    status: AssignmentStatus,
  ): AssignmentCountChanges {
    if (count <= 0) return {};
    const delta: AssignmentCountChanges = { total: count };
    if (AssignmentCounterService.bucketOf(status) === "ongoing") {
      delta.ongoing = count;
    }
    return delta;
  }

  /**
   * Delta for removing an assignment that currently has `status`.
   * `total` is always decremented; the assignment also leaves its bucket
   * (ONGOING -> ongoing, COMPLETE -> complete). PENDING assignments only
   * touch `total`, so they produce { total: -1 }.
   */
  static unassignChanges(status: AssignmentStatus): AssignmentCountChanges {
    const bucket = AssignmentCounterService.bucketOf(status);
    const delta: AssignmentCountChanges = { total: -1 };
    if (bucket) delta[bucket] = -1;
    return delta;
  }

  /**
   * Builds the counter delta for a single assignment status transition.
   *
   * `from` is the previous status, `to` the new status. `total` is unchanged:
   * the assignment still exists, only its status moved. Call this from any
   * handler that mutates an assignment's status (start, complete) instead of
   * hand-rolling the delta.
   *
   * PENDING -> ONGOING -> { ongoing: +1 }  (start action)
   * ONGOING -> COMPLETE  -> { ongoing: -1, complete: +1 }  (complete action)
   */
  static statusTransitionChanges(
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
