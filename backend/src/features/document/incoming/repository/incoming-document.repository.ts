import { BadRequestException, Injectable, Logger } from "@nestjs/common";
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

@Injectable()
export class IncomingDocumentsRepository {
  private readonly logger = new Logger(IncomingDocumentsRepository.name);
  constructor(
    @InjectRepository(IncomingDocumentEntity)
    private readonly repository: Repository<IncomingDocumentEntity>,
  ) {}

  async create(
    data: Partial<IncomingDocumentEntity>,
    manager: EntityManager,
  ): Promise<IncomingDocumentEntity> {
    const repository = manager.getRepository(IncomingDocumentEntity);
    const entity = repository.create(data);

    return repository.save(entity);
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

    const [sql] = queryBuilder.getQueryAndParameters();

    this.logger.debug(
      `[IncomingPagination] Request: ${JSON.stringify({
        limit,
        sort,
        dateField,
        startDate,
        endDate,
        status,
        hasSearch: Boolean(search?.trim()),
        hasCursor: Boolean(cursor),
        cursorLength: cursor?.length ?? 0,
        sql,
      })}`,
    );

    const documents = await queryBuilder.take(limit + 1).getMany();
    const hasNextPage = documents.length > limit;

    if (hasNextPage) {
      documents.pop();
    }

    const lastDocument = documents.at(-1);
    const fetchedCount = documents.length;

    const nextCursor =
      hasNextPage && lastDocument
        ? encodeCursor<IncomingDocumentCursor>({
            id: lastDocument.id,
            sort,
            sortValue: this.getSortValue(lastDocument, sort),
          })
        : null;

    const nextCursorPayload = nextCursor
      ? decodeCursor<IncomingDocumentCursor>(nextCursor)
      : null;

    this.logger.debug(
      `[IncomingPagination] Result: ${JSON.stringify({
        sort,
        limit,
        fetchedCount,
        returnedCount: documents.length,
        hasNextPage,
        nextCursorPresent: Boolean(nextCursor),
        firstDocumentId: documents[0]?.id ?? null,
        lastDocumentId: lastDocument?.id ?? null,
        returnedDocumentIds: documents.map((document) => document.id),
        nextCursorId: nextCursorPayload?.id ?? null,
        nextCursorSort: nextCursorPayload?.sort ?? null,
        nextCursorSortValue:
          sort === IncomingDocumentSortOrder.SubjectAsc
            ? `[subject length: ${nextCursorPayload?.sortValue?.length ?? 0}]`
            : (nextCursorPayload?.sortValue ?? null),
      })}`,
    );

    return {
      data: documents,
      nextCursor,
    };
  }

  private applySearchFilter(
    queryBuilder: SelectQueryBuilder<IncomingDocumentEntity>,
    search?: string,
  ): void {
    const term = search?.trim();

    if (!term) {
      return;
    }

    queryBuilder.andWhere(
      `incoming.id IN (
      SELECT subject_match.id
      FROM incoming_documents subject_match
      WHERE subject_match.subject ILIKE :search

      UNION

      SELECT code_match.id
      FROM document_files code_file
      INNER JOIN incoming_documents code_match
        ON code_match.document_file_id = code_file.id
      WHERE code_file.code ILIKE :search
    )`,
      { search: `%${term}%` },
    );
  }

  private applyStatusFilter(
    queryBuilder: SelectQueryBuilder<IncomingDocumentEntity>,
    status?: IncomingDocumentStatus,
  ): void {
    if (!status) {
      return;
    }

    queryBuilder.andWhere("incoming.status = :status", { status });
  }

  private applyDateFilter(
    queryBuilder: SelectQueryBuilder<IncomingDocumentEntity>,
    dateField: IncomingDocumentDateField,
    startDate?: string,
    endDate?: string,
  ): void {
    const dateColumns: Record<IncomingDocumentDateField, string> = {
      [IncomingDocumentDateField.UploadDate]: "documentFile.created_at",
      [IncomingDocumentDateField.DateReceived]: "incoming.date_received",
    };

    const column = dateColumns[dateField];

    if (startDate) {
      queryBuilder.andWhere(`${column} >= :startDate`, { startDate });
    }

    if (endDate) {
      if (dateField === IncomingDocumentDateField.UploadDate) {
        // Include the entire end date for the timestamp column.
        queryBuilder.andWhere(`${column} < CAST(:endDate AS date) + INTERVAL '1 day'`, {
          endDate,
        });
      } else {
        // date_received is a PostgreSQL DATE column.
        queryBuilder.andWhere(`${column} <= :endDate`, { endDate });
      }
    }
  }

  private applyCursor(
    queryBuilder: SelectQueryBuilder<IncomingDocumentEntity>,
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
    this.logger.debug(
      `[IncomingPagination] Applying cursor: ${JSON.stringify({
        sort,
        cursorId: id,
        cursorSortValue:
          sort === IncomingDocumentSortOrder.SubjectAsc
            ? `[subject length: ${sortValue.length}]`
            : sortValue,
      })}`,
    );

    switch (sort) {
      case IncomingDocumentSortOrder.NewestUpload:
        this.applyCursorCondition(
          queryBuilder,
          "documentFile.created_at",
          sortValue,
          id,
          "<",
        );
        break;

      case IncomingDocumentSortOrder.OldestUpload:
        this.applyCursorCondition(
          queryBuilder,
          "documentFile.created_at",
          sortValue,
          id,
          ">",
        );
        break;

      case IncomingDocumentSortOrder.LatestReceived:
        this.applyCursorCondition(
          queryBuilder,
          "incoming.date_received",
          sortValue,
          id,
          "<",
        );
        break;

      case IncomingDocumentSortOrder.SubjectAsc:
        this.applyCursorCondition(queryBuilder, "incoming.subject", sortValue, id, ">");
        break;

      default:
        throw new BadRequestException("Unsupported sort order");
    }
  }

  private applyCursorCondition(
    queryBuilder: SelectQueryBuilder<IncomingDocumentEntity>,
    column: string,
    sortValue: string,
    id: string,
    operator: "<" | ">",
  ): void {
    queryBuilder.andWhere(
      `(
      ${column} ${operator} :cursorValue
      OR (
        ${column} = :cursorValue
        AND incoming.id ${operator} :cursorId
      )
    )`,
      {
        cursorValue: sortValue,
        cursorId: id,
      },
    );
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<IncomingDocumentEntity>,
    sort: IncomingDocumentSortOrder,
  ): void {
    switch (sort) {
      case IncomingDocumentSortOrder.NewestUpload:
        queryBuilder
          .orderBy("documentFile.created_at", "DESC")
          .addOrderBy("incoming.id", "DESC");
        break;

      case IncomingDocumentSortOrder.OldestUpload:
        queryBuilder
          .orderBy("documentFile.created_at", "ASC")
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
        return document.document_file.created_at.toISOString();

      case IncomingDocumentSortOrder.LatestReceived:
        return document.date_received;

      case IncomingDocumentSortOrder.SubjectAsc:
        return document.subject;
    }
  }
}
