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

@Injectable()
export class OutgoingDocumentRepository {
  constructor(
    @InjectRepository(OutgoingDocumentEntity)
    private readonly repository: Repository<OutgoingDocumentEntity>,
  ) {}

  async create(
    data: Partial<OutgoingDocumentEntity>,
    manager: EntityManager,
  ): Promise<OutgoingDocumentEntity> {
    const repository = manager.getRepository(OutgoingDocumentEntity);

    const outgoingDocument = repository.create(data);

    return repository.save(outgoingDocument);
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
      uploaderId,
      cursor,
      sort = OutgoingDocumentSortOrder.NewestUpload,
    } = query;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException("startDate must not be later than endDate");
    }

    const queryBuilder = this.repository
      .createQueryBuilder("outgoing")
      .leftJoinAndSelect("outgoing.document_file", "documentFile")
      .leftJoinAndSelect("documentFile.uploader", "uploader");

    this.applySearchFilter(queryBuilder, search);
    this.applyDateFilter(queryBuilder, dateField, startDate, endDate);
    this.applyUploaderFilter(queryBuilder, uploaderId);

    if (cursor) {
      this.applyCursor(queryBuilder, cursor, sort);
    }

    this.applySorting(queryBuilder, sort);

    const documents = await queryBuilder.take(limit + 1).getMany();
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

    return {
      data: documents,
      nextCursor,
    };
  }

  private applySearchFilter(
    queryBuilder: SelectQueryBuilder<OutgoingDocumentEntity>,
    search?: string,
  ): void {
    const term = search?.trim();

    if (!term) {
      return;
    }

    queryBuilder.andWhere(
      `(
        outgoing.subject ILIKE :search
        OR outgoing."to" ILIKE :search
        OR documentFile.code ILIKE :search
        OR CAST(outgoing.tracking_sequence AS TEXT) ILIKE :search
      )`,
      { search: `%${term}%` },
    );
  }

  private applyDateFilter(
    queryBuilder: SelectQueryBuilder<OutgoingDocumentEntity>,
    dateField: OutgoingDocumentDateField,
    startDate?: string,
    endDate?: string,
  ): void {
    const dateColumns: Record<OutgoingDocumentDateField, string> = {
      [OutgoingDocumentDateField.UploadDate]: "documentFile.created_at",
      [OutgoingDocumentDateField.DatePrepared]: "outgoing.date_prepared",
      [OutgoingDocumentDateField.DateReceived]: "outgoing.date_received",
    };

    const column = dateColumns[dateField];

    if (startDate) {
      queryBuilder.andWhere(`${column} >= :startDate`, { startDate });
    }

    if (endDate) {
      if (dateField === OutgoingDocumentDateField.UploadDate) {
        // created_at is a timestamp: include the entire end date.
        queryBuilder.andWhere(`${column} < CAST(:endDate AS date) + INTERVAL '1 day'`, {
          endDate,
        });
      } else {
        // date_prepared and date_received are PostgreSQL DATE columns.
        queryBuilder.andWhere(`${column} <= :endDate`, { endDate });
      }
    }
  }

  private applyUploaderFilter(
    queryBuilder: SelectQueryBuilder<OutgoingDocumentEntity>,
    uploaderId?: string,
  ): void {
    if (!uploaderId) {
      return;
    }

    queryBuilder.andWhere("documentFile.uploader_id = :uploaderId", {
      uploaderId,
    });
  }

  private applyCursor(
    queryBuilder: SelectQueryBuilder<OutgoingDocumentEntity>,
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
        this.applyCursorCondition(
          queryBuilder,
          "documentFile.created_at",
          sortValue,
          id,
          "<",
        );
        break;

      case OutgoingDocumentSortOrder.OldestUpload:
        this.applyCursorCondition(
          queryBuilder,
          "documentFile.created_at",
          sortValue,
          id,
          ">",
        );
        break;

      case OutgoingDocumentSortOrder.LatestPrepared:
        this.applyLatestPreparedCursor(queryBuilder, sortValue, id);
        break;

      case OutgoingDocumentSortOrder.SubjectAsc:
        this.applyCursorCondition(queryBuilder, "outgoing.subject", sortValue, id, ">");
        break;
    }
  }

  private applyCursorCondition(
    queryBuilder: SelectQueryBuilder<OutgoingDocumentEntity>,
    column: string,
    sortValue: string | null,
    id: string,
    operator: "<" | ">",
  ): void {
    if (sortValue === null) {
      throw new BadRequestException("Invalid cursor sort value");
    }

    queryBuilder.andWhere(
      `(
        ${column} ${operator} :cursorValue
        OR (
          ${column} = :cursorValue
          AND outgoing.id ${operator} :cursorId
        )
      )`,
      {
        cursorValue: sortValue,
        cursorId: id,
      },
    );
  }

  private applyLatestPreparedCursor(
    queryBuilder: SelectQueryBuilder<OutgoingDocumentEntity>,
    sortValue: string | null,
    id: string,
  ): void {
    if (sortValue === null) {
      // Continue through NULL dates, which are ordered last.
      queryBuilder.andWhere(
        `outgoing.date_prepared IS NULL
         AND outgoing.id < :cursorId`,
        { cursorId: id },
      );

      return;
    }

    queryBuilder.andWhere(
      `(
        outgoing.date_prepared < :cursorValue
        OR outgoing.date_prepared IS NULL
        OR (
          outgoing.date_prepared = :cursorValue
          AND outgoing.id < :cursorId
        )
      )`,
      {
        cursorValue: sortValue,
        cursorId: id,
      },
    );
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<OutgoingDocumentEntity>,
    sort: OutgoingDocumentSortOrder,
  ): void {
    switch (sort) {
      case OutgoingDocumentSortOrder.NewestUpload:
        queryBuilder
          .orderBy("documentFile.created_at", "DESC")
          .addOrderBy("outgoing.id", "DESC");
        break;

      case OutgoingDocumentSortOrder.OldestUpload:
        queryBuilder
          .orderBy("documentFile.created_at", "ASC")
          .addOrderBy("outgoing.id", "ASC");
        break;

      case OutgoingDocumentSortOrder.LatestPrepared:
        queryBuilder
          .orderBy("outgoing.date_prepared", "DESC", "NULLS LAST")
          .addOrderBy("outgoing.id", "DESC");
        break;

      case OutgoingDocumentSortOrder.SubjectAsc:
        queryBuilder.orderBy("outgoing.subject", "ASC").addOrderBy("outgoing.id", "ASC");
        break;
    }
  }

  private getSortValue(
    document: OutgoingDocumentEntity,
    sort: OutgoingDocumentSortOrder,
  ): string | null {
    switch (sort) {
      case OutgoingDocumentSortOrder.NewestUpload:
      case OutgoingDocumentSortOrder.OldestUpload:
        return document.document_file.created_at.toISOString();

      case OutgoingDocumentSortOrder.LatestPrepared:
        return document.date_prepared;

      case OutgoingDocumentSortOrder.SubjectAsc:
        return document.subject;
    }
  }
}
