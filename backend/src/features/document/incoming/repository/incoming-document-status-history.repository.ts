import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isUUID } from "class-validator";
import { EntityManager, Repository, SelectQueryBuilder } from "typeorm";
import { decodeCursor, encodeCursor } from "../../../../common/pagination/cursor";
import { PaginatedResponse } from "../../../../common/pagination/paginated-response";
import { FindIncomingDocumentStatusHistoriesQueryDto } from "../dto/find-incoming-document-status-histories-query.dto";
import { IncomingDocumentStatusHistoryEntity } from "../entities/incoming-document-status-history-entity";
import {
  CreateStatusHistoryParams,
  IncomingDocumentStatusHistoryCursor,
} from "../types/find-incoming-document-status-histories.types";

type StatusHistoryQueryBuilder = SelectQueryBuilder<IncomingDocumentStatusHistoryEntity>;

@Injectable()
export class IncomingDocumentStatusRepository {
  private static readonly APP_TIME_ZONE = "Asia/Manila";
  constructor(
    @InjectRepository(IncomingDocumentStatusHistoryEntity)
    private readonly repository: Repository<IncomingDocumentStatusHistoryEntity>,
  ) {}
  async createStatusHistory(
    manager: EntityManager,
    data: CreateStatusHistoryParams,
  ): Promise<void> {
    const repository = manager.getRepository(IncomingDocumentStatusHistoryEntity);

    const history = repository.create(data);

    await repository.save(history);
  }

  async findAllByIncomingDocumentId(
    incomingDocumentId: string,
    query: FindIncomingDocumentStatusHistoriesQueryDto,
  ): Promise<PaginatedResponse<IncomingDocumentStatusHistoryEntity>> {
    const { limit, startDate, endDate, cursor } = query;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException("startDate must not be later than endDate");
    }

    const queryBuilder = this.repository
      .createQueryBuilder("history")
      .leftJoin("history.changed_by_user", "changedBy")
      .addSelect(["changedBy.id", "changedBy.full_name", "changedBy.position"])
      .where("history.incoming_document_id = :incomingDocumentId", {
        incomingDocumentId,
      });

    this.applyDateFilter(queryBuilder, startDate, endDate);

    if (cursor) {
      this.applyCursor(queryBuilder, cursor);
    }

    queryBuilder.orderBy("history.created_at", "DESC").addOrderBy("history.id", "DESC");

    const histories = await queryBuilder.limit(limit + 1).getMany();

    const hasNextPage = histories.length > limit;

    if (hasNextPage) {
      histories.pop();
    }

    const lastHistory = histories.at(-1);

    const nextCursor =
      hasNextPage && lastHistory
        ? encodeCursor<IncomingDocumentStatusHistoryCursor>({
            id: lastHistory.id,
          })
        : null;

    return {
      data: histories,
      nextCursor,
    };
  }

  private applyDateFilter(
    queryBuilder: StatusHistoryQueryBuilder,
    startDate?: string,
    endDate?: string,
  ): void {
    const tz = IncomingDocumentStatusRepository.APP_TIME_ZONE;

    if (startDate) {
      queryBuilder.andWhere(
        `history.created_at >= (
          CAST(:startDate AS date)::timestamp AT TIME ZONE :tz
        )`,
        { startDate, tz },
      );
    }

    if (endDate) {
      queryBuilder.andWhere(
        `history.created_at < (
          (CAST(:endDate AS date) + 1)::timestamp AT TIME ZONE :tz
        )`,
        { endDate, tz },
      );
    }
  }

  private applyCursor(queryBuilder: StatusHistoryQueryBuilder, cursor: string): void {
    let decoded: IncomingDocumentStatusHistoryCursor;

    try {
      decoded = decodeCursor<IncomingDocumentStatusHistoryCursor>(cursor);
    } catch {
      throw new BadRequestException(
        "Invalid cursor for incoming document status histories",
      );
    }

    if (!decoded || !isUUID(decoded.id)) {
      throw new BadRequestException(
        "Invalid cursor for incoming document status histories",
      );
    }

    queryBuilder.andWhere(
      `(history.created_at, history.id) < (
        (
          SELECT cursor_row.created_at
          FROM incoming_document_status_histories cursor_row
          WHERE cursor_row.id = CAST(:cursorId AS uuid)
            AND cursor_row.incoming_document_id = :incomingDocumentId
        ),
        CAST(:cursorId AS uuid)
      )`,
      {
        cursorId: decoded.id,
      },
    );
  }
}
