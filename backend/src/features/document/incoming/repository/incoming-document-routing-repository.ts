import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isUUID } from "class-validator";
import { EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { decodeCursor, encodeCursor } from "../../../../common/pagination/cursor";
import { PaginatedResponse } from "../../../../common/pagination/paginated-response";
import { escapeLike } from "../../../../util/escapeLike";
import { DivisionIncomingDocumentResponseDto } from "../dto/division-incoming-document-response.dto";
import { FindDivisionIncomingDocumentsQueryDto } from "../dto/find-division-incoming-documents-query.dto";
import { IncomingDocumentStatus } from "../entities/incoming-document-entity";
import { IncomingDocumentRoutingEntity } from "../entities/incoming-document-routing.entity";
import { DivisionIncomingDocumentSortOrder } from "../enums/division-incoming-document-sort-order.enum";
import { DivisionIncomingDocumentCursor } from "../types/division-incoming-document-cursor";
import { RoutedDivisionSearchResult } from "../types/incoming-document-routing.type";

export type RoutingQueryBuilder = SelectQueryBuilder<IncomingDocumentRoutingEntity>;

@Injectable()
export class IncomingDocumentRoutingRepository {
  private static readonly APP_TIME_ZONE = "Asia/Manila";

  constructor(
    @InjectRepository(IncomingDocumentRoutingEntity)
    private readonly repository: Repository<IncomingDocumentRoutingEntity>,
  ) {}

  async create(
    routing: Partial<IncomingDocumentRoutingEntity>,
    manager: EntityManager,
  ): Promise<IncomingDocumentRoutingEntity> {
    return manager.getRepository(IncomingDocumentRoutingEntity).save(routing);
  }

  async findAllByDivision(
    divisionId: string,
    filters: FindDivisionIncomingDocumentsQueryDto,
  ): Promise<PaginatedResponse<IncomingDocumentRoutingEntity>> {
    const { limit, search, status, startDate, endDate, sort, cursor } = filters;

    this.validateDateRange(startDate, endDate);

    const queryBuilder = this.repository
      .createQueryBuilder("routing")
      .innerJoinAndSelect("routing.incoming_document", "incoming")
      .innerJoinAndSelect("incoming.document_file", "documentFile")
      .select([
        "routing.id",
        "routing.routed_at",

        "incoming.id",
        "incoming.subject",
        "incoming.recipient",
        "incoming.status",

        "documentFile.id",
        "documentFile.code",
      ])
      .where("routing.division_id = :divisionId", { divisionId });

    this.applySearch(queryBuilder, search);
    this.applyStatusFilter(queryBuilder, status);
    this.applyRoutedDateFilter(queryBuilder, startDate, endDate);

    if (cursor) {
      this.applyCursor(queryBuilder, cursor, sort, divisionId);
    }

    this.applySorting(queryBuilder, sort);

    const results = await queryBuilder.take(limit + 1).getMany();

    const hasNextPage = results.length > limit;

    if (hasNextPage) {
      results.pop();
    }

    const lastResult = results.at(-1);

    const nextCursor =
      hasNextPage && lastResult
        ? encodeCursor<DivisionIncomingDocumentCursor>({
            id: lastResult.id,
            divisionId,
            sort,
            routedAt: lastResult.routed_at.toISOString(),
          })
        : null;

    return {
      data: results,
      nextCursor,
    };
  }

  private applySearch(queryBuilder: RoutingQueryBuilder, search?: string): void {
    if (!search?.trim()) {
      return;
    }

    const term = `%${escapeLike(search.trim())}%`;

    queryBuilder.andWhere("incoming.subject ILIKE :search ESCAPE '\\'", {
      search: term,
    });
  }

  private applyStatusFilter(
    queryBuilder: RoutingQueryBuilder,
    status?: IncomingDocumentStatus,
  ): void {
    if (!status) {
      return;
    }

    queryBuilder.andWhere("incoming.status = :status", { status });
  }

  private applyRoutedDateFilter(
    queryBuilder: RoutingQueryBuilder,
    startDate?: string,
    endDate?: string,
  ): void {
    const tz = IncomingDocumentRoutingRepository.APP_TIME_ZONE;

    if (startDate) {
      queryBuilder.andWhere(
        `routing.routed_at >= (
        CAST(:startDate AS date)::timestamp AT TIME ZONE :tz
      )`,
        {
          startDate,
          tz,
        },
      );
    }

    if (endDate) {
      queryBuilder.andWhere(
        `routing.routed_at < (
        (CAST(:endDate AS date) + 1)::timestamp AT TIME ZONE :tz
      )`,
        {
          endDate,
          tz,
        },
      );
    }
  }

  private applySorting(
    queryBuilder: RoutingQueryBuilder,
    sort: DivisionIncomingDocumentSortOrder,
  ): void {
    switch (sort) {
      case DivisionIncomingDocumentSortOrder.NewestRouted:
        queryBuilder
          .orderBy("routing.routed_at", "DESC")
          .addOrderBy("routing.id", "DESC");
        break;

      case DivisionIncomingDocumentSortOrder.OldestRouted:
        queryBuilder.orderBy("routing.routed_at", "ASC").addOrderBy("routing.id", "ASC");
        break;

      default:
        throw new BadRequestException("Invalid sort order.");
    }
  }

  private applyCursor(
    queryBuilder: RoutingQueryBuilder,
    cursor: string,
    sort: DivisionIncomingDocumentSortOrder,
    divisionId: string,
  ): void {
    const decoded = this.decodeAndValidateCursor(cursor, sort, divisionId);

    const operator = sort === DivisionIncomingDocumentSortOrder.NewestRouted ? "<" : ">";

    queryBuilder.andWhere(
      `(routing.routed_at, routing.id) ${operator} (
      CAST(:routedAt AS timestamptz),
      CAST(:cursorId AS uuid)
    )`,
      {
        routedAt: decoded.routedAt,
        cursorId: decoded.id,
      },
    );
  }

  private decodeAndValidateCursor(
    cursor: string,
    sort: DivisionIncomingDocumentSortOrder,
    divisionId: string,
  ): DivisionIncomingDocumentCursor {
    try {
      const decoded = decodeCursor<DivisionIncomingDocumentCursor>(cursor);

      if (
        !decoded ||
        typeof decoded !== "object" ||
        decoded.divisionId !== divisionId ||
        decoded.sort !== sort ||
        typeof decoded.routedAt !== "string" ||
        !Number.isFinite(Date.parse(decoded.routedAt)) ||
        new Date(decoded.routedAt).toISOString() !== decoded.routedAt
      ) {
        throw new Error("Invalid cursor.");
      }

      return decoded;
    } catch {
      throw new BadRequestException("Invalid pagination cursor.");
    }
  }

  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException("Start date cannot be later than end date.");
    }
  }

  async exists(
    incomingDocumentId: string,
    divisionId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repository = manager
      ? manager.getRepository(IncomingDocumentRoutingEntity)
      : this.repository;

    return repository.exists({
      where: {
        incoming_document_id: incomingDocumentId,
        division_id: divisionId,
      },
    });
  }

  async findByIdForUpdate(
    routingId: string,
    manager: EntityManager,
  ): Promise<IncomingDocumentRoutingEntity | null> {
    return manager
      .getRepository(IncomingDocumentRoutingEntity)
      .createQueryBuilder("routing")
      .setLock("pessimistic_write")
      .where("routing.id = :routingId", { routingId })
      .getOne();
  }

  async findByIncomingDocumentAndDivision(
    incomingDocumentId: string,
    divisionId: string,
    manager: EntityManager,
  ): Promise<IncomingDocumentRoutingEntity | null> {
    return manager.getRepository(IncomingDocumentRoutingEntity).findOne({
      where: {
        incoming_document_id: incomingDocumentId,
        division_id: divisionId,
      },
    });
  }

  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<IncomingDocumentRoutingEntity | null> {
    const repo = manager?.getRepository(IncomingDocumentRoutingEntity) ?? this.repository;

    return repo.findOne({ where: { id } });
  }

  findAssignedDivisionNoticeCountsByIncomingId(incomingDocumentId: string): Promise<
    {
      routing_id: string;
      division_id: string;
      division_name: string;
      total_assignments: string;
      action_taken_count: string;
    }[]
  > {
    return this.repository
      .createQueryBuilder("routing")
      .innerJoin("routing.division", "division")
      .leftJoin("routing.assignment_counters", "routingCounts")
      .where("routing.incoming_document_id = :incomingDocumentId", {
        incomingDocumentId,
      })
      .select("routing.id", "routing_id")
      .addSelect("division.id", "division_id")
      .addSelect("division.division_name", "division_name")
      .addSelect("COALESCE(routingCounts.total, 0)", "total_assignments")
      .addSelect("COALESCE(routingCounts.complete, 0)", "action_taken_count")
      .orderBy("division.division_name", "ASC")
      .getRawMany();
  }

  async searchRoutedDivisions(
    incomingDocumentId: string,
    search: string,
  ): Promise<RoutedDivisionSearchResult[]> {
    const searchTerm = search.trim();

    if (!searchTerm) {
      return [];
    }

    return this.repository
      .createQueryBuilder("routing")
      .innerJoin("routing.division", "division")
      .select("routing.id", "routing_id")
      .addSelect("division.id", "division_id")
      .addSelect("division.division_name", "division_name")
      .where("routing.incoming_document_id = :incomingDocumentId", {
        incomingDocumentId,
      })
      .andWhere("division.division_name ILIKE :search ESCAPE '\\'", {
        search: `%${escapeLike(searchTerm)}%`,
      })
      .orderBy("division.division_name", "ASC")
      .take(20)
      .getRawMany<RoutedDivisionSearchResult>();
  }

  async delete(id: string, manager: EntityManager): Promise<boolean> {
    const result = await manager.getRepository(IncomingDocumentRoutingEntity).delete(id);

    return (result.affected ?? 0) > 0;
  }
}
