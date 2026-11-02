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
        `,
      )
      .leftJoinAndSelect("assignment.division", "division")
      .leftJoinAndSelect("assignment.created_by", "createdBy")
      .leftJoinAndSelect("assignment.action_taken_by", "actionTakenBy")
      .where("routing.id = :routingId", { routingId })
      .orderBy("assignment.created_at", "ASC")
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
      this.applyCursor(queryBuilder, cursor, sort, incomingDocumentId);
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
    incomingDocumentId: string,
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
      typeof decoded.sortValue !== "string"
    ) {
      throw new BadRequestException("Invalid cursor for assignments");
    }

    switch (sort) {
      case AssignmentSort.NEWEST:
        this.applyAssignmentCursor(queryBuilder, decoded.id, incomingDocumentId, "<");
        break;

      case AssignmentSort.OLDEST:
        this.applyAssignmentCursor(queryBuilder, decoded.id, incomingDocumentId, ">");
        break;

      default:
        throw new BadRequestException("Unsupported sort order");
    }
  }

  private applyAssignmentCursor(
    queryBuilder: AssignmentQueryBuilder,
    assignmentId: string,
    incomingDocumentId: string,
    operator: "<" | ">",
  ): void {
    queryBuilder.andWhere(
      `(assignment.created_at, assignment.id) ${operator} (
      (
        SELECT cursor_row.created_at
        FROM incoming_document_assignments cursor_row
        WHERE cursor_row.id = CAST(:cursorId AS uuid)
          AND cursor_row.incoming_document_id = CAST(:incomingDocumentId AS uuid)
      ),
      CAST(:cursorId AS uuid)
    )`,
      {
        cursorId: assignmentId,
        incomingDocumentId,
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

  async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo =
      manager?.getRepository(IncomingDocumentAssignmentEntity) ?? this.repository;

    const res = await repo.delete(id);

    return (res.affected ?? 0) > 0;
  }
}
