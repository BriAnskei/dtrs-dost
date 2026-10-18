import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { decodeCursor, encodeCursor } from "../../../../common/pagination/cursor";
import { PaginatedResponse } from "../../../../common/pagination/paginated-response";
import { FindOutgoingDocumentsQueryDto } from "../dto/find-outgoing-documents-query.dto";
import { OutgoingDocumentEntity } from "../entities/outgoing-document-entity";
import { OutgoingDocumentDateField } from "../enums/outgoing-document-date-field.enum";
import { OutgoingDocumentSortOrder } from "../enums/outgoing-document-sort-order.enum";
import { OutgoingDocumentCursor } from "../types/outgoing-document-cursor.type";

type OutgoingQueryBuilder = SelectQueryBuilder<OutgoingDocumentEntity>;

@Injectable()
export class OutgoingDocumentRepository {
  private static readonly APP_TIME_ZONE = "Asia/Manila";

  constructor(
    @InjectRepository(OutgoingDocumentEntity)
    private readonly repository: Repository<OutgoingDocumentEntity>,
  ) {}

  async create(
    data: Partial<OutgoingDocumentEntity>,
    manager: EntityManager,
  ): Promise<OutgoingDocumentEntity> {
    const repository = manager.getRepository(OutgoingDocumentEntity);
    return repository.save(repository.create(data));
  }

  async findAllWithRelation(
    query: FindOutgoingDocumentsQueryDto,
  ): Promise<PaginatedResponse<OutgoingDocumentEntity>> {
    const {
      limit,
      search,
      dateField,
      startDate,
      endDate,
      cursor,
      sort = OutgoingDocumentSortOrder.NewestUpload,
    } = query;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException("startDate must not be later than endDate");
    }

    // document_file_id is NOT NULL, so INNER JOIN is equivalent to a LEFT JOIN
    // but lets the planner choose the join order freely.
    const queryBuilder = this.repository
      .createQueryBuilder("outgoing")
      .innerJoinAndSelect("outgoing.document_file", "documentFile")
      .leftJoinAndSelect("documentFile.uploader", "uploader");

    this.applySearchFilter(queryBuilder, search);
    this.applyDateFilter(queryBuilder, dateField, startDate, endDate);

    if (cursor) {
      this.applyCursor(queryBuilder, cursor, sort);
    }

    this.applySorting(queryBuilder, sort);

    // Fetch one extra row to detect whether another page exists.
    // limit() is safe here: every join is one-to-one or many-to-one.
    const documents = await queryBuilder.limit(limit + 1).getMany();
    const hasNextPage = documents.length > limit;

    if (hasNextPage) {
      documents.pop();
    }

    const lastDocument = documents.at(-1);

    const nextCursor =
      hasNextPage && lastDocument
        ? encodeCursor<OutgoingDocumentCursor>({
            id: lastDocument.id,
            sort,
            sortValue: this.getSortValue(lastDocument, sort),
          })
        : null;

    return { data: documents, nextCursor };
  }

  private applySearchFilter(queryBuilder: OutgoingQueryBuilder, search?: string): void {
    const term = search?.trim();

    if (!term) {
      return;
    }

    // Escape LIKE wildcards so user input is matched literally.
    // ILIKE uses backslash as the default escape character.
    const escaped = term.replace(/[\\%_]/g, "\\$&");

    // Two independent subqueries so each side can use its own trigram GIN index
    // (idx_outgoing_documents_subject_trgm, idx_document_files_code_trgm).
    // A plain OR across two tables cannot be answered by a BitmapOr.
    // UNION ALL: duplicates are harmless inside IN (...) and it skips the dedupe step.
    queryBuilder.andWhere(
      `outgoing.id IN (
        SELECT subject_match.id
        FROM outgoing_documents subject_match
        WHERE subject_match.subject ILIKE :search

        UNION ALL

        SELECT code_match.id
        FROM document_files code_file
        INNER JOIN outgoing_documents code_match
          ON code_match.document_file_id = code_file.id
        WHERE code_file.code ILIKE :search
      )`,
      { search: `%${escaped}%` },
    );
  }

  private applyDateFilter(
    queryBuilder: OutgoingQueryBuilder,
    dateField: OutgoingDocumentDateField,
    startDate?: string,
    endDate?: string,
  ): void {
    if (dateField === OutgoingDocumentDateField.UploadDate) {
      // created_at is timestamptz. Convert the date-only bounds to
      // Manila-midnight instants, so the filter doesn't depend on the
      // DB session timezone. The column stays untouched, so the index is used.
      const tz = OutgoingDocumentRepository.APP_TIME_ZONE;

      if (startDate) {
        queryBuilder.andWhere(
          `outgoing.created_at >= (CAST(:startDate AS date)::timestamp AT TIME ZONE :tz)`,
          { startDate, tz },
        );
      }

      if (endDate) {
        // Exclusive upper bound: midnight at the start of the day after endDate.
        queryBuilder.andWhere(
          `outgoing.created_at < ((CAST(:endDate AS date) + 1)::timestamp AT TIME ZONE :tz)`,
          { endDate, tz },
        );
      }

      return;
    }

    // date_prepared and date_received are plain DATE columns: no timezone involved.
    const column =
      dateField === OutgoingDocumentDateField.DatePrepared
        ? "outgoing.date_prepared"
        : "outgoing.date_received";

    if (startDate) {
      queryBuilder.andWhere(`${column} >= :startDate`, { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere(`${column} <= :endDate`, { endDate });
    }
  }

  private applyCursor(
    queryBuilder: OutgoingQueryBuilder,
    cursor: string,
    sort: OutgoingDocumentSortOrder,
  ): void {
    // Structural validation is performed by @IsValidCursor() in the DTO.
    const decoded = decodeCursor<OutgoingDocumentCursor>(cursor);

    // The cursor must match the currently selected sort order.
    if (decoded.sort !== sort) {
      throw new BadRequestException("Cursor does not match the selected sort order");
    }

    const { id, sortValue } = decoded;

    switch (sort) {
      case OutgoingDocumentSortOrder.NewestUpload:
        this.applyUploadCursor(queryBuilder, id, "<");
        break;

      case OutgoingDocumentSortOrder.OldestUpload:
        this.applyUploadCursor(queryBuilder, id, ">");
        break;

      case OutgoingDocumentSortOrder.LatestPrepared:
        this.applyCursorCondition(
          queryBuilder,
          "outgoing.date_prepared",
          "date",
          sortValue,
          id,
          "<",
        );
        break;

      case OutgoingDocumentSortOrder.SubjectAsc:
        this.applyCursorCondition(
          queryBuilder,
          "outgoing.subject",
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
   * Sort key is (outgoing.created_at, outgoing.id), both on outgoing_documents,
   * so it matches idx_outgoing_documents_created_at_id and never has to walk the
   * shared document_files table (most of whose rows belong to incoming files).
   *
   * The cursor's created_at is looked up from the DB instead of being taken from
   * the cursor string: a JS Date only has millisecond precision while timestamptz
   * has microseconds, which would skip or duplicate rows on near-ties.
   *
   * The scalar subquery is uncorrelated, so Postgres evaluates it once as an
   * InitPlan and the row comparison can still be used as an index condition.
   */
  private applyUploadCursor(
    queryBuilder: OutgoingQueryBuilder,
    outgoingId: string,
    operator: "<" | ">",
  ): void {
    queryBuilder.andWhere(
      `(outgoing.created_at, outgoing.id) ${operator} (
        (SELECT cursor_doc.created_at
           FROM outgoing_documents cursor_doc
          WHERE cursor_doc.id = CAST(:cursorId AS uuid)),
        CAST(:cursorId AS uuid)
      )`,
      { cursorId: outgoingId },
    );
  }

  /**
   * Row-wise comparison so Postgres can turn it into a single index range on
   * (column, id) instead of scanning and filtering through an OR.
   * Requires both columns to be sorted in the same direction (they are).
   */
  private applyCursorCondition(
    queryBuilder: OutgoingQueryBuilder,
    column: string,
    castType: "date" | "text",
    sortValue: string | null,
    id: string,
    operator: "<" | ">",
  ): void {
    if (sortValue === null) {
      throw new BadRequestException("Invalid cursor sort value");
    }

    queryBuilder.andWhere(
      `(${column}, outgoing.id) ${operator} (CAST(:cursorValue AS ${castType}), CAST(:cursorId AS uuid))`,
      { cursorValue: sortValue, cursorId: id },
    );
  }

  private applySorting(
    queryBuilder: OutgoingQueryBuilder,
    sort: OutgoingDocumentSortOrder,
  ): void {
    switch (sort) {
      case OutgoingDocumentSortOrder.NewestUpload:
        queryBuilder
          .orderBy("outgoing.created_at", "DESC")
          .addOrderBy("outgoing.id", "DESC");
        break;

      case OutgoingDocumentSortOrder.OldestUpload:
        queryBuilder
          .orderBy("outgoing.created_at", "ASC")
          .addOrderBy("outgoing.id", "ASC");
        break;

      case OutgoingDocumentSortOrder.LatestPrepared:
        queryBuilder
          .orderBy("outgoing.date_prepared", "DESC")
          .addOrderBy("outgoing.id", "DESC");
        break;

      case OutgoingDocumentSortOrder.SubjectAsc:
        queryBuilder.orderBy("outgoing.subject", "ASC").addOrderBy("outgoing.id", "ASC");
        break;

      default:
        throw new BadRequestException("Unsupported sort order");
    }
  }

  private getSortValue(
    document: OutgoingDocumentEntity,
    sort: OutgoingDocumentSortOrder,
  ): string | null {
    switch (sort) {
      case OutgoingDocumentSortOrder.NewestUpload:
      case OutgoingDocumentSortOrder.OldestUpload:
        // Informational only: the exact created_at is re-read from the DB in applyUploadCursor.
        return document.created_at.toISOString();

      case OutgoingDocumentSortOrder.LatestPrepared:
        return document.date_prepared;

      case OutgoingDocumentSortOrder.SubjectAsc:
        return document.subject;
    }
  }
}
