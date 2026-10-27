/**
 * Unit tests for `ExtractedDocumentQueueRepository`.
 *
 * THE REPOSITORY (repository/extracted-document-queue.repository.ts):
 *
 *   class ExtractedDocumentQueueRepository @InjectRepository(ExtractedDocumentQueueEntity)
 *
 * Methods:
 *   - create(data, manager?): saves a new entity, using manager.getRepository if
 *     a transaction manager is passed, else the injected repository.
 *   - findOneForUpdate(id, manager): pessimistic_write lock, joined nothing.
 *   - findAll(query): paginated list of PENDING queues with cursor pagination,
 *     filtering by uploader_name, unknown_uploader, decision, sort. Returns
 *     { data, nextCursor }.
 *   - findAllByUploaderId(id, query): inner-joined uploader scope, filters by
 *     file_name / decision / status / sort / cursor.
 *   - findById / findOneByIdWithJoin / findOneById: lookups.
 *   - updateStatus / delete: boolean success (affected > 0).
 *
 * STRATEGY:
 *   No real database. We build a chainable mock QueryBuilder (the methods the
 *   source calls: leftJoinAndSelect, leftJoin, addSelect, where, andWhere,
 *   orderBy, addOrderBy, take, getMany) plus a mock Repository whose
 *   createQueryBuilder returns it. This lets us assert the WHERE/ORDER BY clauses
 *   built by `findAll` and `findAllByUploaderId` without a live DB.
 *
 * CURSOR PAGINATION NOTE:
 *   `findAll`/`findAllByUploaderId` call `take(limit + 1)` — if the result has
 *   more rows than `limit`, the last is popped and `nextCursor` is encoded from
 *   that popped row. We simulate by returning `limit + 1` rows in the mock
 *   builder to test the "hasNextPage" branch, and exactly `limit` rows to test
 *   the "no next page" branch.
 */

import { EntityManager, Repository } from "typeorm";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ExtractedDocumentQueueRepository } from "./extracted-document-queue.repository";
import { ExtractedDocumentQueueEntity } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import { encodeCursor } from "../../../../common/pagination/cursor";
import type { FindExtractedDocumentQueuesQueryDto } from "../dto/find-extracted-document-queues-query.dto";
import type { FindMyExtractedDocumentQueuesQueryDto } from "../dto/find-my-extracted-document-queues-query.dto";

/**
 * A chainable mock QueryBuilder. Every method returns `this` so the production
 * code can chain `.leftJoinAndSelect(...).leftJoin(...).where(...).andWhere(...)`
 * and eventually call `.take(n).getMany()`.
 *
 * Call assertions read `calls` after execution.
 */
function makeMockQueryBuilder() {
  const calls: Record<string, unknown> = {};

  const qb = {
    calls,
    leftJoinAndSelect: jest.fn(function (relation, alias) {
      calls.leftJoinAndSelect = [relation, alias];
      return qb;
    }),
    leftJoin: jest.fn(function (relation, alias) {
      calls.leftJoin = [relation, alias];
      return qb;
    }),
    innerJoinAndSelect: jest.fn(function (relation, alias) {
      calls.innerJoinAndSelect = [relation, alias];
      return qb;
    }),
    addSelect: jest.fn(function (cols) {
      calls.addSelect = [cols];
      return qb;
    }),
    where: jest.fn(function (cond, params) {
      calls.where = [cond, params];
      return qb;
    }),
    andWhere: jest.fn(function (cond, params) {
      const existing = (calls.andWhere ?? []) as unknown[][];
      calls.andWhere = [...existing, [cond, params]];
      return qb;
    }),
    orderBy: jest.fn(function (col, dir) {
      calls.orderBy = [col, dir];
      return qb;
    }),
    addOrderBy: jest.fn(function (col, dir) {
      calls.addOrderBy = [col, dir];
      return qb;
    }),
    take: jest.fn(function (n) {
      calls.take = [n];
      return qb;
    }),
    getMany: jest.fn(async function () {
      calls.getMany = true;
      // Return whatever the test pre-set (via `_rows`).
      return (qb as any)._rows ?? [];
    }),
    // Internal: rows to return from getMany. Set before execute.
    _rows: [] as unknown[],
    _setRows(rows: unknown[]) {
      (qb as any)._rows = rows;
      return qb;
    },
  };

  return qb;
}

/** Build the repository with an injectable mock Repository. */
async function buildRepository() {
  const mockQb = makeMockQueryBuilder();

  const mockRepository: Partial<Repository<ExtractedDocumentQueueEntity>> = {
    createQueryBuilder: jest.fn(() => mockQb),
    create: jest.fn() as jest.Mock,
    save: jest.fn() as jest.Mock,
    findOne: jest.fn() as jest.Mock,
    update: jest.fn() as jest.Mock,
    delete: jest.fn() as jest.Mock,
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      ExtractedDocumentQueueRepository,
      { provide: getRepositoryToken(ExtractedDocumentQueueEntity), useValue: mockRepository },
    ],
  }).compile();

  return {
    repository: moduleRef.get(ExtractedDocumentQueueRepository),
    mockRepository,
    mockQb,
  };
}

/** Make a queue entity row with sensible defaults. */
function makeQueue(overrides: Partial<ExtractedDocumentQueueEntity> = {}): ExtractedDocumentQueueEntity {
  return {
    id: "q-1",
    document_file_id: "df-1",
    extracted_data: [],
    extracted_chunks: [],
    decision: "REVIEW",
    status: ExtractedDocumentQueueStatus.PENDING,
    created_at: new Date("2026-10-01T00:00:00Z"),
    document_file: {
      file_name: "f.pdf",
      object_key: "key",
      uploader_id: "u-1",
      uploader: { id: "u-1", full_name: "Jane Doe" },
    },
    ...overrides,
  } as unknown as ExtractedDocumentQueueEntity;
}

describe("ExtractedDocumentQueueRepository", () => {
  describe("create", () => {
    it("saves via the injected repository when no manager is provided", async () => {
      const { repository, mockRepository } = await buildRepository();

      const data = { decision: "ACCEPT" as const };
      const saved = makeQueue({ decision: "ACCEPT" });
      (mockRepository.create as jest.Mock).mockReturnValue(saved);
      (mockRepository.save as jest.Mock).mockResolvedValue(saved);

      const result = await repository.create(data);

      expect(mockRepository.create).toHaveBeenCalledWith(data);
      expect(mockRepository.save).toHaveBeenCalledWith(saved);
      expect(result).toBe(saved);
    });

    it("uses the manager-scoped repository when a manager is provided", async () => {
      const { repository, mockRepository } = await buildRepository();

      const managerRepo = {
        create: jest.fn().mockReturnValue({ id: "x" }),
        save: jest.fn().mockResolvedValue({ id: "x" }),
      };

      const manager = {
        getRepository: jest.fn().mockReturnValue(managerRepo),
      } as unknown as EntityManager;

      await repository.create({ decision: "ACCEPT" } as never, manager);

      expect(manager.getRepository).toHaveBeenCalledWith(ExtractedDocumentQueueEntity);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(managerRepo.save).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("filters by PENDING status by default", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAll({ limit: 20 } as FindExtractedDocumentQueuesQueryDto);

      expect(mockQb.where).toHaveBeenCalledWith("queue.status = :status", {
        status: "PENDING",
      });
    });

    it("adds uploader_name ILIKE filter when provided", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAll({
        limit: 20,
        uploader_name: "Jane",
      } as FindExtractedDocumentQueuesQueryDto);

      const andWhereCalls = mockQb.calls.andWhere as unknown[][];
      expect(andWhereCalls).toContainEqual([
        "uploader.full_name ILIKE :uploaderName",
        { uploaderName: "%Jane%" },
      ]);
    });

    it("filters unknown_uploader=true as IS NULL", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAll({
        limit: 20,
        unknown_uploader: true,
      } as FindExtractedDocumentQueuesQueryDto);

      expect(mockQb.calls.andWhere).toContainEqual([
        "document_file.uploader_id IS NULL",
      ]);
    });

    it("filters unknown_uploader=false as IS NOT NULL", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAll({
        limit: 20,
        unknown_uploader: false,
      } as FindExtractedDocumentQueuesQueryDto);

      expect(mockQb.calls.andWhere).toContainEqual([
        "document_file.uploader_id IS NOT NULL",
      ]);
    });

    it("filters decision when provided", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAll({
        limit: 20,
        decision: "ACCEPT",
      } as FindExtractedDocumentQueuesQueryDto);

      expect(mockQb.calls.andWhere).toContainEqual([
        "queue.decision = :decision",
        { decision: "ACCEPT" },
      ]);
    });

    it("sorts newest by DESC when sort=newest", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAll({
        limit: 20,
        sort: "newest",
      } as FindExtractedDocumentQueuesQueryDto);

      expect(mockQb.orderBy).toHaveBeenCalledWith("queue.created_at", "DESC");
      expect(mockQb.addOrderBy).toHaveBeenCalledWith("queue.id", "DESC");
    });

    it("sorts oldest by ASC when sort=oldest", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAll({
        limit: 20,
        sort: "oldest",
      } as FindExtractedDocumentQueuesQueryDto);

      expect(mockQb.orderBy).toHaveBeenCalledWith("queue.created_at", "ASC");
      expect(mockQb.addOrderBy).toHaveBeenCalledWith("queue.id", "ASC");
    });

    it("encodes nextCursor when there are more rows than limit", async () => {
      const { repository, mockQb } = await buildRepository();

      // Return limit+1 rows to trigger hasNextPage path.
      const rows = Array.from({ length: 6 }, (_, i) =>
        makeQueue({ id: `q-${i}`, created_at: new Date(`2026-10-0${i + 1}T00:00:00Z`) }),
      );
      mockQb._setRows(rows);

      const result = await repository.findAll({
        limit: 5,
      } as FindExtractedDocumentQueuesQueryDto);

      expect(mockQb.take).toHaveBeenCalledWith(6);
      expect(result.data).toHaveLength(5); // one popped
      expect(result.nextCursor).not.toBeNull();

      // The nextCursor should decode back to the last (popped) row.
      const decoded = JSON.parse(Buffer.from(result.nextCursor!, "base64url").toString("utf8"));
      expect(decoded.id).toBe("q-4");
    });

    it("returns nextCursor=null when rows <= limit", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([
        makeQueue({ id: "q-1" }),
        makeQueue({ id: "q-2" }),
      ]);

      const result = await repository.findAll({ limit: 5 } as FindExtractedDocumentQueuesQueryDto);

      expect(result.data).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });

    it("applies cursor WHERE clause for newest sort", async () => {
      const { repository, mockQb } = await buildRepository();

      const cursor = encodeCursor({ createdAt: "2026-10-01T00:00:00Z", id: "q-1" });
      mockQb._setRows([]);

      await repository.findAll({
        limit: 5,
        cursor,
        sort: "newest",
      } as FindExtractedDocumentQueuesQueryDto);

      expect(mockQb.calls.andWhere).toContainEqual([
        expect.stringContaining("queue.created_at < :cursorCreatedAt"),
        { cursorCreatedAt: "2026-10-01T00:00:00Z", cursorId: "q-1" },
      ]);
    });

    it("applies cursor WHERE clause for oldest sort", async () => {
      const { repository, mockQb } = await buildRepository();

      const cursor = encodeCursor({ createdAt: "2026-10-01T00:00:00Z", id: "q-1" });
      mockQb._setRows([]);

      await repository.findAll({
        limit: 5,
        cursor,
        sort: "oldest",
      } as FindExtractedDocumentQueuesQueryDto);

      expect(mockQb.calls.andWhere).toContainEqual([
        expect.stringContaining("queue.created_at > :cursorCreatedAt"),
        { cursorCreatedAt: "2026-10-01T00:00:00Z", cursorId: "q-1" },
      ]);
    });
  });

  describe("findAllByUploaderId", () => {
    it("inner-joins document_file and filters by uploaderId", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAllByUploaderId("uploader-1", {
        limit: 20,
      } as FindMyExtractedDocumentQueuesQueryDto);

      expect(mockQb.innerJoinAndSelect).toHaveBeenCalledWith(
        "queue.document_file",
        "document_file",
      );
      expect(mockQb.where).toHaveBeenCalledWith(
        "document_file.uploader_id = :uploaderId",
        { uploaderId: "uploader-1" },
      );
    });

    it("filters by file_name when provided", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAllByUploaderId("u1", {
        limit: 20,
        file_name: "report",
      } as FindMyExtractedDocumentQueuesQueryDto);

      expect(mockQb.calls.andWhere).toContainEqual([
        "document_file.file_name ILIKE :fileName",
        { fileName: "%report%" },
      ]);
    });

    it("filters by decision and status", async () => {
      const { repository, mockQb } = await buildRepository();

      mockQb._setRows([]);

      await repository.findAllByUploaderId("u1", {
        limit: 20,
        decision: "ACCEPT",
        status: ExtractedDocumentQueueStatus.INVALIDATED,
      } as FindMyExtractedDocumentQueuesQueryDto);

      expect(mockQb.calls.andWhere).toContainEqual([
        "queue.decision = :decision",
        { decision: "ACCEPT" },
      ]);
      expect(mockQb.calls.andWhere).toContainEqual([
        "queue.status = :status",
        { status: "INVALIDATED" },
      ]);
    });

    it("encodes nextCursor when more rows than limit", async () => {
      const { repository, mockQb } = await buildRepository();

      const rows = Array.from({ length: 11 }, (_, i) =>
        makeQueue({ id: `q-${i}` }),
      );
      mockQb._setRows(rows);

      const result = await repository.findAllByUploaderId("u1", {
        limit: 10,
      } as FindMyExtractedDocumentQueuesQueryDto);

      expect(mockQb.take).toHaveBeenCalledWith(11);
      expect(result.data).toHaveLength(10);
      expect(result.nextCursor).not.toBeNull();
    });
  });

  describe("find lookups", () => {
    it("findById uses injected repo (no manager)", async () => {
      const { repository, mockRepository } = await buildRepository();

      mockRepository.findOne = jest.fn().mockResolvedValue(makeQueue({ id: "found" }));

      const result = await repository.findById("found");

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: "found" } });
      expect(result?.id).toBe("found");
    });

    it("findOneByIdWithJoin uses manager repo when provided", async () => {
      const { repository, mockRepository } = await buildRepository();

      const managerRepo = { findOne: jest.fn().mockResolvedValue(makeQueue()) };
      const manager = {
        getRepository: jest.fn().mockReturnValue(managerRepo),
      } as unknown as EntityManager;

      await repository.findOneByIdWithJoin("q-1", manager);

      expect(manager.getRepository).toHaveBeenCalledWith(ExtractedDocumentQueueEntity);
      expect(managerRepo.findOne).toHaveBeenCalledWith({
        where: { id: "q-1" },
        relations: { document_file: { uploader: true } },
      });
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("returns true when affected > 0", async () => {
      const { repository, mockRepository } = await buildRepository();

      mockRepository.update = jest.fn().mockResolvedValue({ affected: 1 });

      const result = await repository.updateStatus("q-1", ExtractedDocumentQueueStatus.APPROVED);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: "q-1" },
        { status: "APPROVED" },
      );
      expect(result).toBe(true);
    });

    it("returns false when affected is 0", async () => {
      const { repository, mockRepository } = await buildRepository();

      mockRepository.update = jest.fn().mockResolvedValue({ affected: 0 });

      const result = await repository.updateStatus("q-1", ExtractedDocumentQueueStatus.INVALIDATED);

      expect(result).toBe(false);
    });
  });

  describe("delete", () => {
    it("returns true when affected > 0", async () => {
      const { repository, mockRepository } = await buildRepository();

      mockRepository.delete = jest.fn().mockResolvedValue({ affected: 1 });

      const result = await repository.delete("q-1");

      expect(mockRepository.delete).toHaveBeenCalledWith("q-1");
      expect(result).toBe(true);
    });

    it("returns false when affected is 0", async () => {
      const { repository, mockRepository } = await buildRepository();

      mockRepository.delete = jest.fn().mockResolvedValue({ affected: 0 });

      const result = await repository.delete("ghost");

      expect(result).toBe(false);
    });
  });
});
