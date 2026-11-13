import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { decodeCursor, encodeCursor } from "../../../../../common/pagination/cursor";
import { applyCursorCondition } from "../../../../../common/pagination/cursor-query.util";
import { PaginatedResponse } from "../../../../../common/pagination/paginated-response";
import { escapeLike } from "../../../../../util/escapeLike";
import { FindIncomingDocumentsQueryDto } from "../../dto/find-incoming-documents-query.dto";
import { RoutedIncomingDocumentDetailsDto } from "../../dto/get-division-incoming-document-details-dto";
import {
  IncomingDocumentEntity,
  IncomingDocumentStatus,
} from "../../entities/incoming-document-entity";
import { IncomingDocumentDateField } from "../../enums/incoming-document-date-field.enum";
import { IncomingDocumentSortOrder } from "../../enums/incoming-document-sort-order.enum";
import { IncomingDocumentDetailsRaw } from "../../types/get-division-incoming-document-details.types";
import { IncomingDocumentCursor } from "../../types/incoming-document-cursor";

type IncomingQueryBuilder = SelectQueryBuilder<IncomingDocumentEntity>;

@Injectable()
export class IncomingDocumentsReadRepository {
  private static readonly APP_TIME_ZONE = "Asia/Manila";

  constructor(
    @InjectRepository(IncomingDocumentEntity)
    private readonly repository: Repository<IncomingDocumentEntity>,
  ) {}

  async findDetailsByDivision(
    incomingDocumentId: string,
    divisionId: string,
  ): Promise<RoutedIncomingDocumentDetailsDto | null> {
    const raw = await this.repository
      .createQueryBuilder("document")
      .innerJoin("document.document_file", "file")
      .innerJoin("document.routings", "routing", "routing.division_id = :divisionId", {
        divisionId,
      })
      .leftJoin("routing.assignment_counters", "routingCounter")
      .select("document.id", "id")
      .addSelect("file.code", "code")
      .addSelect("document.subject", "subject")
      .addSelect("document.summary", "summary")
      .addSelect("document.document_from", "sender")
      .addSelect("document.recipient", "recipient")
      .addSelect("document.date_received", "dateReceived")
      .addSelect("document.created_at", "createdAt")
      .addSelect("document.updated_at", "updatedAt")
      .addSelect("COALESCE(routingCounter.total, 0)::text", "routingAssignmentTotal")
      .addSelect("COALESCE(routingCounter.ongoing, 0)::text", "routingAssignmentOngoing")
      .addSelect(
        "COALESCE(routingCounter.complete, 0)::text",
        "routingAssignmentComplete",
      )
      .where("document.id = :incomingDocumentId", {
        incomingDocumentId,
      })
      .getRawOne<IncomingDocumentDetailsRaw>();

    if (!raw) {
      return null;
    }

    return {
      id: raw.id,
      code: raw.code,
      subject: raw.subject,
      summary: raw.summary,
      sender: raw.sender,
      recipient: raw.recipient,
      dateReceived: raw.dateReceived,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      routingAssignmentCounts: {
        total: raw.routingAssignmentTotal,
        ongoing: raw.routingAssignmentOngoing,
        complete: raw.routingAssignmentComplete,
      },
    };
  }

  async findAllWithRelation(
    query: FindIncomingDocumentsQueryDto,
  ): Promise<PaginatedResponse<IncomingDocumentEntity>> {
    const {
      limit,
      search,
      status,
      dateField,
      startDate,
      endDate,
      cursor,
      sort = IncomingDocumentSortOrder.NewestUpload,
    } = query;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException("startDate must not be later than endDate");
    }

    const queryBuilder = this.repository
      .createQueryBuilder("incoming")
      .innerJoinAndSelect("incoming.document_file", "documentFile")
      .leftJoinAndSelect("documentFile.uploader", "uploader");

    this.applySearchFilter(queryBuilder, search);
    this.applyStatusFilter(queryBuilder, status);
    this.applyDateFilter(queryBuilder, dateField, startDate, endDate);

    if (cursor) {
      this.applyCursor(queryBuilder, cursor, sort);
    }

    this.applySorting(queryBuilder, sort);

    const documents = await queryBuilder.limit(limit + 1).getMany();
    const hasNextPage = documents.length > limit;

    if (hasNextPage) {
      documents.pop();
    }

    const lastDocument = documents.at(-1);

    const nextCursor =
      hasNextPage && lastDocument
        ? encodeCursor<IncomingDocumentCursor>({
            id: lastDocument.id, // always incoming_documents.id now
            sort,
            sortValue: this.getSortValue(lastDocument, sort),
          })
        : null;

    return { data: documents, nextCursor };
  }

  private applySearchFilter(queryBuilder: IncomingQueryBuilder, search?: string): void {
    const term = search?.trim();

    if (!term) {
      return;
    }

    const escaped = escapeLike(term);

    // Two independent branches so each can use its own trigram GIN index:
    //   - incoming_documents.subject  -> idx_incoming_documents_subject_trgm
    //   - document_files.code         -> idx_document_files_code_trgm
    // document_files is shared with outgoing_documents; joining back to
    // incoming_documents keeps only rows that belong to incoming.
    queryBuilder.andWhere(
      `incoming.id IN (
        SELECT subject_match.id
        FROM incoming_documents subject_match
        WHERE subject_match.subject ILIKE :search

        UNION ALL

        SELECT code_match.id
        FROM document_files code_file
        INNER JOIN incoming_documents code_match
          ON code_match.document_file_id = code_file.id
        WHERE code_file.code ILIKE :search
      )`,
      { search: `%${escaped}%` },
    );
  }

  private applyStatusFilter(
    queryBuilder: IncomingQueryBuilder,
    status?: IncomingDocumentStatus,
  ): void {
    if (status) {
      queryBuilder.andWhere("incoming.status = :status", { status });
    }
  }

  private applyDateFilter(
    queryBuilder: IncomingQueryBuilder,
    dateField: IncomingDocumentDateField,
    startDate?: string,
    endDate?: string,
  ): void {
    if (dateField === IncomingDocumentDateField.UploadDate) {
      // created_at is timestamptz and now lives on incoming_documents.
      // Convert the date-only bounds to Manila-midnight instants so the filter
      // doesn't depend on the DB session timezone. The column stays untouched,
      // so idx_incoming_documents_created_id can be used.
      const tz = IncomingDocumentsReadRepository.APP_TIME_ZONE;

      if (startDate) {
        queryBuilder.andWhere(
          `incoming.created_at >= (CAST(:startDate AS date)::timestamp AT TIME ZONE :tz)`,
          { startDate, tz },
        );
      }

      if (endDate) {
        // Exclusive upper bound: midnight at the start of the day after endDate.
        queryBuilder.andWhere(
          `incoming.created_at < ((CAST(:endDate AS date) + 1)::timestamp AT TIME ZONE :tz)`,
          { endDate, tz },
        );
      }

      return;
    }

    // date_received is a plain DATE, so there's no timezone involved.
    if (startDate) {
      queryBuilder.andWhere("incoming.date_received >= :startDate", { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere("incoming.date_received <= :endDate", { endDate });
    }
  }

  private applyCursor(
    queryBuilder: IncomingQueryBuilder,
    cursor: string,
    sort: IncomingDocumentSortOrder,
  ): void {
    const decoded = decodeCursor<IncomingDocumentCursor>(cursor);

    if (
      !decoded ||
      typeof decoded.id !== "string" ||
      decoded.sort !== sort ||
      typeof decoded.sortValue !== "string"
    ) {
      throw new BadRequestException("Invalid cursor for incoming documents");
    }

    const { id, sortValue } = decoded;

    switch (sort) {
      case IncomingDocumentSortOrder.NewestUpload:
        this.applyUploadCursor(queryBuilder, id, "<");
        break;

      case IncomingDocumentSortOrder.OldestUpload:
        this.applyUploadCursor(queryBuilder, id, ">");
        break;

      case IncomingDocumentSortOrder.LatestReceived:
        this.applyCursorCondition(
          queryBuilder,
          "incoming.date_received",
          "date",
          sortValue,
          id,
          "<",
        );
        break;

      case IncomingDocumentSortOrder.SubjectAsc:
        this.applyCursorCondition(
          queryBuilder,
          "incoming.subject",
          "text",
          sortValue,
          id,
          ">",
        );
        break;

      default:
        throw new BadRequestException("Unsupported sort order");
    }
  }

  /**
   * Sort key is (incoming.created_at, incoming.id), both on incoming_documents,
   * so it matches idx_incoming_documents_created_id (forward or backward scan).
   *
   * The cursor's created_at is looked up from the DB instead of being taken from
   * the cursor string: a JS Date only has millisecond precision while timestamptz
   * has microseconds, which would skip or duplicate rows on near-ties.
   *
   * The scalar subquery is uncorrelated, so Postgres evaluates it once as an
   * InitPlan and the row comparison can still be used as an index condition.
   * (A stale cursor whose id no longer exists yields NULL -> an empty page.)
   */
  private applyUploadCursor(
    queryBuilder: IncomingQueryBuilder,
    incomingId: string,
    operator: "<" | ">",
  ): void {
    queryBuilder.andWhere(
      `(incoming.created_at, incoming.id) ${operator} (
        (SELECT cursor_row.created_at
           FROM incoming_documents cursor_row
          WHERE cursor_row.id = CAST(:cursorId AS uuid)),
        CAST(:cursorId AS uuid)
      )`,
      { cursorId: incomingId },
    );
  }

  /**
   * Row-wise comparison so Postgres can turn it into a single index range on
   * (column, id) instead of scanning and filtering through an OR.
   * Requires both columns to be sorted in the same direction (they are).
   */
  private applyCursorCondition(
    queryBuilder: IncomingQueryBuilder,
    column: string,
    castType: "date" | "text",
    sortValue: string,
    id: string,
    operator: "<" | ">",
  ): void {
    applyCursorCondition(queryBuilder, {
      column,
      alias: "incoming",
      castType,
      sortValue,
      id,
      operator,
    });
  }

  private applySorting(
    queryBuilder: IncomingQueryBuilder,
    sort: IncomingDocumentSortOrder,
  ): void {
    switch (sort) {
      case IncomingDocumentSortOrder.NewestUpload:
        queryBuilder
          .orderBy("incoming.created_at", "DESC")
          .addOrderBy("incoming.id", "DESC");
        break;

      case IncomingDocumentSortOrder.OldestUpload:
        queryBuilder
          .orderBy("incoming.created_at", "ASC")
          .addOrderBy("incoming.id", "ASC");
        break;

      case IncomingDocumentSortOrder.LatestReceived:
        queryBuilder
          .orderBy("incoming.date_received", "DESC")
          .addOrderBy("incoming.id", "DESC");
        break;

      case IncomingDocumentSortOrder.SubjectAsc:
        queryBuilder.orderBy("incoming.subject", "ASC").addOrderBy("incoming.id", "ASC");
        break;

      default:
        throw new BadRequestException("Unsupported sort order");
    }
  }

  private getSortValue(
    document: IncomingDocumentEntity,
    sort: IncomingDocumentSortOrder,
  ): string {
    switch (sort) {
      case IncomingDocumentSortOrder.NewestUpload:
      case IncomingDocumentSortOrder.OldestUpload:
        // Informational only: the real created_at is re-read from the DB in applyUploadCursor.
        return document.created_at.toISOString();

      case IncomingDocumentSortOrder.LatestReceived:
        return document.date_received;

      case IncomingDocumentSortOrder.SubjectAsc:
        return document.subject;
    }
  }

  async findByDocumentFileId(
    documentFileId: string,
  ): Promise<IncomingDocumentEntity | null> {
    return this.repository.findOne({
      where: {
        document_file: {
          id: documentFileId,
        },
      },
    });
  }

  async findByIdWithFile(id: string): Promise<IncomingDocumentEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: {
        document_file: true,
      },
    });
  }
  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<IncomingDocumentEntity | null> {
    const repository = manager?.getRepository(IncomingDocumentEntity) ?? this.repository;

    return repository.findOne({ where: { id } });
  }

  async findByIdWithFullDetails(id: string): Promise<{
    document: IncomingDocumentEntity;
    assignedDivisionCount: number;
  } | null> {
    const [document, routingCount] = await Promise.all([
      this.repository
        .createQueryBuilder("incoming")
        .innerJoinAndSelect("incoming.document_file", "documentFile")
        .leftJoinAndSelect("documentFile.uploader", "uploader")
        .leftJoinAndSelect("incoming.assignment_counts", "assignmentCounts")
        .where("incoming.id = :id", { id })
        .getOne(),

      this.repository
        .createQueryBuilder("incoming")
        .leftJoin("incoming.routings", "routing")
        .select("COUNT(routing.id)", "assigned_division_count")
        .where("incoming.id = :id", { id })
        .getRawOne<{ assigned_division_count: string }>(),
    ]);

    if (!document) {
      return null;
    }

    return {
      document,
      assignedDivisionCount: Number(routingCount?.assigned_division_count ?? 0),
    };
  }
}
