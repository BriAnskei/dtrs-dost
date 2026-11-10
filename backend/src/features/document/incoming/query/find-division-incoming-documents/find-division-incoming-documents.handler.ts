import { BadRequestException, Injectable } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { isUUID } from "class-validator";
import { Repository, SelectQueryBuilder } from "typeorm";

import { decodeCursor, encodeCursor } from "../../../../../common/pagination/cursor";
import { PaginatedResponse } from "../../../../../common/pagination/paginated-response";

import {
  IncomingDocumentEntity,
  IncomingDocumentStatus,
} from "../../entities/incoming-document-entity";

import { IncomingDocumentRoutingEntity } from "../../entities/incoming-document-routing.entity";

import { IncomingDocumentDateField } from "../../enums/incoming-document-date-field.enum";
import { IncomingDocumentSortOrder } from "../../enums/incoming-document-sort-order.enum";
import { DivisionIncomingDocumentResponseDto } from "./division-incoming-document-response.dto";
import { FindDivisionIncomingDocumentsQuery } from "./find-division-incoming-documents.query";

interface IncomingDocumentCursor {
  id: string;
  sort: IncomingDocumentSortOrder;
  sortValue: string;
}

type DivisionQueryBuilder = SelectQueryBuilder<IncomingDocumentRoutingEntity>;

@Injectable()
@QueryHandler(FindDivisionIncomingDocumentsQuery)
export class FindDivisionIncomingDocumentsHandler
  implements IQueryHandler<FindDivisionIncomingDocumentsQuery>
{
  private static readonly APP_TIME_ZONE = "Asia/Manila";

  constructor(
    @InjectRepository(IncomingDocumentRoutingEntity)
    private readonly routingRepository: Repository<IncomingDocumentRoutingEntity>,
  ) {}

  async execute(
    query: FindDivisionIncomingDocumentsQuery,
  ): Promise<PaginatedResponse<DivisionIncomingDocumentResponseDto>> {
    const { divisionId, filters } = query;

    const {
      limit,
      search,
      status,
      dateField,
      startDate,
      endDate,
      cursor,
      sort = IncomingDocumentSortOrder.NewestUpload,
    } = filters;

    if (!isUUID(divisionId)) {
      throw new BadRequestException("Invalid division ID");
    }

    this.validateDateRange(startDate, endDate);

    const queryBuilder = this.routingRepository
      .createQueryBuilder("routing")
      .innerJoinAndSelect("routing.incoming_document", "incoming")
      .innerJoinAndSelect("incoming.document_file", "documentFile")
      .leftJoinAndSelect("documentFile.uploader", "uploader")
      .where("routing.division_id = :divisionId", {
        divisionId,
      });

    this.applySearchFilter(queryBuilder, search);
    this.applyStatusFilter(queryBuilder, status);

    this.applyDateFilter(queryBuilder, dateField, startDate, endDate);

    if (cursor) {
      this.applyCursor(queryBuilder, cursor, sort);
    }

    this.applySorting(queryBuilder, sort);

    const routings = await queryBuilder.take(limit + 1).getMany();

    const hasNextPage = routings.length > limit;

    if (hasNextPage) {
      routings.pop();
    }

    const lastRouting = routings.at(-1);

    const nextCursor =
      hasNextPage && lastRouting
        ? encodeCursor<IncomingDocumentCursor>({
            id: lastRouting.incoming_document.id,
            sort,
            sortValue: this.getSortValue(lastRouting.incoming_document, sort),
          })
        : null;

    return {
      data: routings.map((routing) =>
        this.toDto(routing.incoming_document, routing.routed_at),
      ),
      nextCursor,
    };
  }

  // --------------------------------------------------
  // RESPONSE MAPPING
  // --------------------------------------------------

  private toDto(
    document: IncomingDocumentEntity,
    routedAt: Date,
  ): DivisionIncomingDocumentResponseDto {
    const dto = new DivisionIncomingDocumentResponseDto();

    dto.id = document.id;
    dto.document_file_id = document.document_file_id;

    dto.file_name = document.document_file.file_name;
    dto.object_key = document.document_file.object_key;
    dto.code = document.document_file.code;

    dto.tracking_sequence = document.tracking_sequence;

    dto.subject = document.subject;
    dto.document_from = document.document_from;
    dto.recipient = document.recipient;
    dto.date_received = document.date_received;

    dto.status = document.status;
    dto.summary = document.summary;

    dto.updated_at = document.updated_at;
    dto.created_at = document.created_at;

    dto.uploader_id = document.document_file.uploader_id;
    dto.uploader_name = document.document_file.uploader?.full_name ?? null;

    dto.routed_at = routedAt;

    return dto;
  }

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException("startDate must not be later than endDate");
    }
  }

  // --------------------------------------------------
  // SEARCH FILTER
  // --------------------------------------------------

  private applySearchFilter(queryBuilder: DivisionQueryBuilder, search?: string): void {
    const term = search?.trim();

    if (!term) {
      return;
    }

    const escaped = this.escapeLike(term);

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
      {
        search: `%${escaped}%`,
      },
    );
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, "\\$&");
  }

  // --------------------------------------------------
  // STATUS FILTER
  // --------------------------------------------------

  private applyStatusFilter(
    queryBuilder: DivisionQueryBuilder,
    status?: IncomingDocumentStatus,
  ): void {
    if (!status) {
      return;
    }

    queryBuilder.andWhere("incoming.status = :status", {
      status,
    });
  }

  // --------------------------------------------------
  // DATE FILTER
  // --------------------------------------------------

  private applyDateFilter(
    queryBuilder: DivisionQueryBuilder,
    dateField: IncomingDocumentDateField,
    startDate?: string,
    endDate?: string,
  ): void {
    const tz = FindDivisionIncomingDocumentsHandler.APP_TIME_ZONE;

    switch (dateField) {
      case IncomingDocumentDateField.UploadDate: {
        if (startDate) {
          queryBuilder.andWhere(
            `incoming.created_at >= (
              CAST(:startDate AS date)::timestamp AT TIME ZONE :tz
            )`,
            { startDate, tz },
          );
        }

        if (endDate) {
          queryBuilder.andWhere(
            `incoming.created_at < (
              (CAST(:endDate AS date) + 1)::timestamp AT TIME ZONE :tz
            )`,
            { endDate, tz },
          );
        }

        break;
      }

      case IncomingDocumentDateField.ReceivedDate: {
        if (startDate) {
          queryBuilder.andWhere("incoming.date_received >= :startDate", { startDate });
        }

        if (endDate) {
          queryBuilder.andWhere("incoming.date_received <= :endDate", { endDate });
        }

        break;
      }

      case IncomingDocumentDateField.RoutedDate: {
        if (startDate) {
          queryBuilder.andWhere(
            `routing.routed_at >= (
              CAST(:startDate AS date)::timestamp AT TIME ZONE :tz
            )`,
            { startDate, tz },
          );
        }

        if (endDate) {
          queryBuilder.andWhere(
            `routing.routed_at < (
              (CAST(:endDate AS date) + 1)::timestamp AT TIME ZONE :tz
            )`,
            { endDate, tz },
          );
        }

        break;
      }

      default:
        throw new BadRequestException("Unsupported incoming document date field");
    }
  }

  // --------------------------------------------------
  // CURSOR PAGINATION
  // --------------------------------------------------

  private applyCursor(
    queryBuilder: DivisionQueryBuilder,
    cursor: string,
    sort: IncomingDocumentSortOrder,
  ): void {
    let decoded: IncomingDocumentCursor;

    try {
      decoded = decodeCursor<IncomingDocumentCursor>(cursor);
    } catch {
      throw new BadRequestException("Invalid cursor for incoming documents");
    }

    if (
      !decoded ||
      typeof decoded !== "object" ||
      !isUUID(decoded.id) ||
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
   * Re-read created_at from PostgreSQL instead of relying on the
   * JavaScript Date stored in the cursor.
   *
   * This preserves PostgreSQL microsecond timestamp precision.
   */
  private applyUploadCursor(
    queryBuilder: DivisionQueryBuilder,
    incomingId: string,
    operator: "<" | ">",
  ): void {
    queryBuilder.andWhere(
      `(incoming.created_at, incoming.id) ${operator} (
        (
          SELECT cursor_row.created_at
          FROM incoming_documents cursor_row
          WHERE cursor_row.id = CAST(:cursorId AS uuid)
        ),
        CAST(:cursorId AS uuid)
      )`,
      {
        cursorId: incomingId,
      },
    );
  }

  private applyCursorCondition(
    queryBuilder: DivisionQueryBuilder,
    column: "incoming.date_received" | "incoming.subject",
    castType: "date" | "text",
    sortValue: string,
    id: string,
    operator: "<" | ">",
  ): void {
    queryBuilder.andWhere(
      `(${column}, incoming.id) ${operator} (
        CAST(:sortValue AS ${castType}),
        CAST(:cursorId AS uuid)
      )`,
      {
        sortValue,
        cursorId: id,
      },
    );
  }

  // --------------------------------------------------
  // SORTING
  // --------------------------------------------------

  private applySorting(
    queryBuilder: DivisionQueryBuilder,
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
        return document.created_at.toISOString();

      case IncomingDocumentSortOrder.LatestReceived:
        return document.date_received;

      case IncomingDocumentSortOrder.SubjectAsc:
        return document.subject;

      default:
        throw new BadRequestException("Unsupported sort order");
    }
  }
}
