import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { decodeCursor, encodeCursor } from "../../../../common/pagination/cursor";
import { PaginatedResponse } from "../../../../common/pagination/paginated-response";
import { escapeLike } from "../../../../util/escapeLike";
import { AssignmentSort } from "../dto/get-incoming-document-assignments-dto";
import {
  IncomingDocumentAssignmentEntity,
  OfficeType,
} from "../entities/incoming-document-assignment.entity";
import { IncomingDocumentRoutingEntity } from "../entities/incoming-document-routing.entity";
import { AssignmentStatus } from "../enums/assignment-status.enum";
import {
  GetIncomingDocumentAssignmentsFilters,
  IncomingDocumentAssignmentCursor,
} from "../types/get-incoming-document-assignment.type";

type AssignmentQueryBuilder = SelectQueryBuilder<IncomingDocumentAssignmentEntity>;

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

  async findAllByRoutingId(
    routingId: string,
  ): Promise<IncomingDocumentAssignmentEntity[]> {
    return this.repository
      .createQueryBuilder("assignment")
      .innerJoin(
        IncomingDocumentRoutingEntity,
        "routing",
        `
      routing.incoming_document_id = assignment.incoming_document_id
      AND routing.division_id = assignment.division_id
      AND assignment.office_type = :officeType
      `,
        { officeType: OfficeType.DIVISION },
      )
      .leftJoinAndSelect("assignment.created_by", "created_by")
      .leftJoinAndSelect("assignment.action_taken_by", "action_taken_by")
      .where("routing.id = :routingId", { routingId })
      .getMany();
  }

  async findAllByIncomingDocumentId(
    incomingDocumentId: string,
    filters: GetIncomingDocumentAssignmentsFilters,
  ): Promise<PaginatedResponse<IncomingDocumentAssignmentEntity>> {
    const {
      limit,
      search,
      status,
      officeType,
      cursor,
      sort = AssignmentSort.NEWEST,
    } = filters;

    const queryBuilder = this.repository
      .createQueryBuilder("assignment")

      // Assigned by
      .leftJoin("assignment.created_by", "createdBy")
      .addSelect(["createdBy.id", "createdBy.full_name", "createdBy.position"])

      // Division
      .leftJoin("assignment.division", "division")
      .addSelect(["division.id", "division.division_name"])

      // Action taken by
      .leftJoin("assignment.action_taken_by", "actionTakenBy")
      .addSelect([
        "actionTakenBy.id",
        "actionTakenBy.full_name",
        "actionTakenBy.position",
      ])

      .where("assignment.incoming_document_id = :incomingDocumentId", {
        incomingDocumentId,
      });

    this.applySearchFilter(queryBuilder, search);
    this.applyStatusFilter(queryBuilder, status);
    this.applyOfficeTypeFilter(queryBuilder, officeType);

    if (cursor) {
      this.applyCursor(queryBuilder, cursor, sort);
    }

    this.applySorting(queryBuilder, sort);

    const assignments = await queryBuilder.limit(limit + 1).getMany();

    const hasNextPage = assignments.length > limit;

    if (hasNextPage) {
      assignments.pop();
    }

    const lastAssignment = assignments.at(-1);

    const nextCursor =
      hasNextPage && lastAssignment
        ? encodeCursor<IncomingDocumentAssignmentCursor>({
            id: lastAssignment.id,
            sort,
            sortValue: lastAssignment.created_at.toISOString(),
          })
        : null;

    return {
      data: assignments,
      nextCursor,
    };
  }

  private applySearchFilter(queryBuilder: AssignmentQueryBuilder, search?: string): void {
    const term = search?.trim();

    if (!term) {
      return;
    }

    queryBuilder.andWhere("assignment.notice_of_action ILIKE :search", {
      search: `%${escapeLike(term)}%`,
    });
  }
  private applyCursor(
    queryBuilder: AssignmentQueryBuilder,
    cursor: string,
    sort: AssignmentSort,
  ): void {
    let decoded: IncomingDocumentAssignmentCursor;

    try {
      decoded = decodeCursor<IncomingDocumentAssignmentCursor>(cursor);
    } catch {
      throw new BadRequestException("Invalid cursor for assignments");
    }

    if (
      !decoded ||
      typeof decoded.id !== "string" ||
      decoded.sort !== sort ||
      typeof decoded.sortValue !== "string" ||
      !Number.isFinite(Date.parse(decoded.sortValue))
    ) {
      throw new BadRequestException("Invalid cursor for assignments");
    }

    switch (sort) {
      case AssignmentSort.NEWEST:
        this.applyAssignmentCursor(queryBuilder, decoded.sortValue, decoded.id, "<");
        break;

      case AssignmentSort.OLDEST:
        this.applyAssignmentCursor(queryBuilder, decoded.sortValue, decoded.id, ">");
        break;

      default:
        throw new BadRequestException("Unsupported sort order");
    }
  }

  private applyAssignmentCursor(
    queryBuilder: AssignmentQueryBuilder,
    cursorCreatedAt: string,
    cursorId: string,
    operator: "<" | ">",
  ): void {
    queryBuilder.andWhere(
      `(assignment.created_at, assignment.id) ${operator} (
      CAST(:cursorCreatedAt AS timestamptz),
      CAST(:cursorId AS uuid)
    )`,
      {
        cursorCreatedAt,
        cursorId,
      },
    );
  }

  private applyStatusFilter(
    queryBuilder: AssignmentQueryBuilder,
    status?: AssignmentStatus,
  ): void {
    if (status) {
      queryBuilder.andWhere("assignment.status = :status", {
        status,
      });
    }
  }

  private applyOfficeTypeFilter(
    queryBuilder: AssignmentQueryBuilder,
    officeType?: OfficeType,
  ): void {
    if (officeType) {
      queryBuilder.andWhere("assignment.office_type = :officeType", {
        officeType,
      });
    }
  }

  private applySorting(queryBuilder: AssignmentQueryBuilder, sort: AssignmentSort): void {
    switch (sort) {
      case AssignmentSort.NEWEST:
        queryBuilder
          .orderBy("assignment.created_at", "DESC")
          .addOrderBy("assignment.id", "DESC");
        break;

      case AssignmentSort.OLDEST:
        queryBuilder
          .orderBy("assignment.created_at", "ASC")
          .addOrderBy("assignment.id", "ASC");
        break;

      default:
        throw new BadRequestException("Unsupported sort order");
    }
  }

  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<IncomingDocumentAssignmentEntity | null> {
    const repo =
      manager?.getRepository(IncomingDocumentAssignmentEntity) ?? this.repository;

    return repo.findOne({
      where: { id },
    });
  }

  async findByIdWithRouting(
    assignmentId: string,
    manager: EntityManager,
  ): Promise<{
    assignment: IncomingDocumentAssignmentEntity;
    routingId: string | null;
  } | null> {
    const { entities, raw } = await manager
      .getRepository(IncomingDocumentAssignmentEntity)
      .createQueryBuilder("assignment")
      .leftJoin(
        IncomingDocumentRoutingEntity,
        "routing",
        `
        routing.incoming_document_id = assignment.incoming_document_id
        AND routing.division_id = assignment.division_id
      `,
      )
      .addSelect("routing.id", "routing_id")
      .where("assignment.id = :assignmentId", { assignmentId })
      .getRawAndEntities();

    if (!entities.length) return null;

    return {
      assignment: entities[0],
      routingId: raw[0]?.routing_id ?? null,
    };
  }

  async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo =
      manager?.getRepository(IncomingDocumentAssignmentEntity) ?? this.repository;

    const res = await repo.delete(id);

    return (res.affected ?? 0) > 0;
  }
}
