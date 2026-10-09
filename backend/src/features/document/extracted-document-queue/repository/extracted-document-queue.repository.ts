import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { decodeCursor, encodeCursor } from "../../../../common/pagination/cursor";
import { PaginatedResponse } from "../../../../common/pagination/paginated-response";
import { FindExtractedDocumentQueuesQueryDto } from "../dto/find-extracted-document-queues-query.dto";
import {
  ExtractedDocumentQueueSort,
  FindMyExtractedDocumentQueuesQueryDto,
} from "../dto/find-my-extracted-document-queues-query.dto";
import { ExtractedDocumentQueueEntity } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueCursor } from "../types/extracted-document-queue.cursor";

@Injectable()
export class ExtractedDocumentQueueRepository {
  constructor(
    @InjectRepository(ExtractedDocumentQueueEntity)
    private readonly repository: Repository<ExtractedDocumentQueueEntity>,
  ) {}

  async create(
    data: Partial<ExtractedDocumentQueueEntity>,
    manager?: EntityManager,
  ): Promise<ExtractedDocumentQueueEntity> {
    const repo = manager
      ? manager.getRepository(ExtractedDocumentQueueEntity)
      : this.repository;

    return repo.save(repo.create(data));
  }

  async findAll(
    query: FindExtractedDocumentQueuesQueryDto,
  ): Promise<PaginatedResponse<ExtractedDocumentQueueEntity>> {
    const {
      limit,
      cursor,
      uploader_name,
      unknown_uploader,
      decision,
      sort = "newest",
    } = query;

    const queryBuilder = this.repository
      .createQueryBuilder("queue")
      .leftJoinAndSelect("queue.document_file", "document_file")
      .leftJoin("document_file.uploader", "uploader")
      .addSelect(["uploader.id", "uploader.full_name"]);

    if (uploader_name) {
      queryBuilder.andWhere("uploader.full_name ILIKE :uploaderName", {
        uploaderName: `%${uploader_name}%`,
      });
    }

    if (unknown_uploader !== undefined) {
      if (unknown_uploader) {
        queryBuilder.andWhere("document_file.uploader_id IS NULL");
      } else {
        queryBuilder.andWhere("document_file.uploader_id IS NOT NULL");
      }
    }

    if (decision) {
      queryBuilder.andWhere("queue.decision = :decision", {
        decision,
      });
    }

    if (cursor) {
      const decodedCursor = decodeCursor<ExtractedDocumentQueueCursor>(cursor);

      if (sort === "newest") {
        queryBuilder.andWhere(
          `(
          queue.created_at < :cursorCreatedAt
          OR (
            queue.created_at = :cursorCreatedAt
            AND queue.id < :cursorId
          )
        )`,
          {
            cursorCreatedAt: decodedCursor.createdAt,
            cursorId: decodedCursor.id,
          },
        );
      } else {
        queryBuilder.andWhere(
          `(
          queue.created_at > :cursorCreatedAt
          OR (
            queue.created_at = :cursorCreatedAt
            AND queue.id > :cursorId
          )
        )`,
          {
            cursorCreatedAt: decodedCursor.createdAt,
            cursorId: decodedCursor.id,
          },
        );
      }
    }

    if (sort === "newest") {
      queryBuilder.orderBy("queue.created_at", "DESC").addOrderBy("queue.id", "DESC");
    } else {
      queryBuilder.orderBy("queue.created_at", "ASC").addOrderBy("queue.id", "ASC");
    }

    const queues = await queryBuilder.take(limit + 1).getMany();

    const hasNextPage = queues.length > limit;

    if (hasNextPage) {
      queues.pop();
    }

    const lastQueue = queues.at(-1);

    const nextCursor =
      hasNextPage && lastQueue
        ? encodeCursor<ExtractedDocumentQueueCursor>({
            createdAt: lastQueue.created_at.toISOString(),
            id: lastQueue.id,
          })
        : null;

    return {
      data: queues,
      nextCursor,
    };
  }

  // handler for reciever view
  async findAllByUploaderId(
    uploaderId: string,
    query: FindMyExtractedDocumentQueuesQueryDto,
  ): Promise<PaginatedResponse<ExtractedDocumentQueueEntity>> {
    const {
      limit,
      cursor,
      file_name,
      decision,
      status,
      sort = ExtractedDocumentQueueSort.NEWEST,
    } = query;

    const queryBuilder = this.repository
      .createQueryBuilder("queue")
      .innerJoinAndSelect("queue.document_file", "document_file")
      .where("document_file.uploader_id = :uploaderId", {
        uploaderId,
      });

    if (file_name) {
      queryBuilder.andWhere("document_file.file_name ILIKE :fileName", {
        fileName: `%${file_name}%`,
      });
    }

    if (decision) {
      queryBuilder.andWhere("queue.decision = :decision", {
        decision,
      });
    }

    if (status) {
      queryBuilder.andWhere("queue.status = :status", {
        status,
      });
    }

    if (cursor) {
      const decodedCursor = decodeCursor<ExtractedDocumentQueueCursor>(cursor);

      if (sort === ExtractedDocumentQueueSort.NEWEST) {
        queryBuilder.andWhere(
          `(
          queue.created_at < :cursorCreatedAt
          OR (
            queue.created_at = :cursorCreatedAt
            AND queue.id < :cursorId
          )
        )`,
          {
            cursorCreatedAt: decodedCursor.createdAt,
            cursorId: decodedCursor.id,
          },
        );
      } else {
        queryBuilder.andWhere(
          `(
          queue.created_at > :cursorCreatedAt
          OR (
            queue.created_at = :cursorCreatedAt
            AND queue.id > :cursorId
          )
        )`,
          {
            cursorCreatedAt: decodedCursor.createdAt,
            cursorId: decodedCursor.id,
          },
        );
      }
    }

    if (sort === ExtractedDocumentQueueSort.NEWEST) {
      queryBuilder.orderBy("queue.created_at", "DESC").addOrderBy("queue.id", "DESC");
    } else {
      queryBuilder.orderBy("queue.created_at", "ASC").addOrderBy("queue.id", "ASC");
    }

    const queues = await queryBuilder.take(limit + 1).getMany();

    const hasNextPage = queues.length > limit;

    if (hasNextPage) {
      queues.pop();
    }

    const lastQueue = queues.at(-1);

    const nextCursor =
      hasNextPage && lastQueue
        ? encodeCursor<ExtractedDocumentQueueCursor>({
            createdAt: lastQueue.created_at.toISOString(),
            id: lastQueue.id,
          })
        : null;

    return {
      data: queues,
      nextCursor,
    };
  }
}
