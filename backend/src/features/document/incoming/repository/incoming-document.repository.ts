import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { decodeCursor, encodeCursor } from "../../../../common/pagination/cursor";
import { PaginatedResponse } from "../../../../common/pagination/paginated-response";
import { FindIncomingDocumentsQueryDto } from "../dto/find-incoming-documents-query.dto";
import {
  IncomingDocumentEntity,
  IncomingDocumentStatus,
} from "../entities/incoming-document-entity";
import { IncomingDocumentDateField } from "../enums/incoming-document-date-field.enum";
import { IncomingDocumentSortOrder } from "../enums/incoming-document-sort-order.enum";
import { IncomingDocumentCursor } from "../types/incoming-document-cursor";

type IncomingQueryBuilder = SelectQueryBuilder<IncomingDocumentEntity>;

@Injectable()
export class IncomingDocumentsRepository {
  private static readonly APP_TIME_ZONE = "Asia/Manila";

  constructor(
    @InjectRepository(IncomingDocumentEntity)
    private readonly repository: Repository<IncomingDocumentEntity>,
  ) {}

  async create(
    data: Partial<IncomingDocumentEntity>,
    manager: EntityManager,
  ): Promise<IncomingDocumentEntity> {
    const repository = manager.getRepository(IncomingDocumentEntity);
    return repository.save(repository.create(data));
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
            id: this.getCursorId(lastDocument, sort),
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

    // Escape LIKE wildcards so user input is matched literally.
    // ILIKE uses backslash as the default escape character.
    const escaped = term.replace(/[\\%_]/g, "\\$&");

    // Two independent subqueries so each side can use its own trigram GIN index.
    // UNION ALL: duplicates are harmless inside IN (...) and it skips the dedupe step.
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
      // created_at is timestamptz. Convert the date-only bounds to
      // Manila-midnight instants, so the filter doesn't depend on the
      // DB session timezone. The column stays untouched, so the index is used.
      const tz = IncomingDocumentsRepository.APP_TIME_ZONE;

      if (startDate) {
        queryBuilder.andWhere(
          `documentFile.created_at >= (CAST(:startDate AS date)::timestamp AT TIME ZONE :tz)`,
          { startDate, tz },
        );
      }

      if (endDate) {
        // Exclusive upper bound: midnight at the start of the day after endDate.
        queryBuilder.andWhere(
          `documentFile.created_at < ((CAST(:endDate AS date) + 1)::timestamp AT TIME ZONE :tz)`,
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
        // For upload sorts, `id` is the document_files.id.
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
   * Sort key is (documentFile.created_at, documentFile.id), both on one table,
   * so it matches idx_document_files_created_at_id.
   *
   * The cursor's created_at is looked up from the DB instead of being taken from
   * the cursor string: a JS Date only has millisecond precision while timestamptz
   * has microseconds, which would skip or duplicate rows on near-ties.
   *
   * The scalar subquery is uncorrelated, so Postgres evaluates it once as an
   * InitPlan and the row comparison can still be used as an index condition.
   */
  private applyUploadCursor(
    queryBuilder: IncomingQueryBuilder,
    documentFileId: string,
    operator: "<" | ">",
  ): void {
    queryBuilder.andWhere(
      `(documentFile.created_at, documentFile.id) ${operator} (
        (SELECT cursor_file.created_at
           FROM document_files cursor_file
          WHERE cursor_file.id = CAST(:cursorId AS uuid)),
        CAST(:cursorId AS uuid)
      )`,
      { cursorId: documentFileId },
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
    queryBuilder.andWhere(
      `(${column}, incoming.id) ${operator} (CAST(:cursorValue AS ${castType}), CAST(:cursorId AS uuid))`,
      { cursorValue: sortValue, cursorId: id },
    );
  }

  private applySorting(
    queryBuilder: IncomingQueryBuilder,
    sort: IncomingDocumentSortOrder,
  ): void {
    switch (sort) {
      case IncomingDocumentSortOrder.NewestUpload:
        queryBuilder
          .orderBy("documentFile.created_at", "DESC")
          .addOrderBy("documentFile.id", "DESC");
        break;

      case IncomingDocumentSortOrder.OldestUpload:
        queryBuilder
          .orderBy("documentFile.created_at", "ASC")
          .addOrderBy("documentFile.id", "ASC");
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

  private getCursorId(
    document: IncomingDocumentEntity,
    sort: IncomingDocumentSortOrder,
  ): string {
    switch (sort) {
      case IncomingDocumentSortOrder.NewestUpload:
      case IncomingDocumentSortOrder.OldestUpload:
        return document.document_file.id;

      case IncomingDocumentSortOrder.LatestReceived:
      case IncomingDocumentSortOrder.SubjectAsc:
        return document.id;
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
        return document.document_file.created_at.toISOString();

      case IncomingDocumentSortOrder.LatestReceived:
        return document.date_received;

      case IncomingDocumentSortOrder.SubjectAsc:
        return document.subject;
    }
  }
}
