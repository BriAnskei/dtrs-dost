/**
 * Unit tests for `ExtractedDocumentQueueService` — the backend service that
 * wraps the extracted-document-queue repository and performs DTO mapping.
 *
 * THE SERVICE (service/extracted-document-queue.service.ts):
 *
 *   class ExtractedDocumentQueueService
 *   constructor(private readonly repository: ExtractedDocumentQueueRepository)
 *
 *   create(data, manager): Promise<ExtractedDocumentQueueEntity>
 *     — delegates to `repository.create(data, manager)`.
 *
 *   findAll(query): Promise<PaginatedResponse<ExtractedDocumentQueueResponseDto>>
 *     — calls `repository.findAll(query)`, maps each entity to a
 *       `ExtractedDocumentQueueResponseDto` via the private `toDto` method,
 *       and returns `{ data, nextCursor }`.
 *
 * WHAT WE MOCK:
 *   - `ExtractedDocumentQueueRepository` — `create` and `findAll` are stubbed
 *     so we control what entities come back and can assert forwarding.
 *
 * SCENARIOS:
 *   - create: forwards data + manager to the repository.
 *   - findAll: maps entity → DTO correctly (including null uploader).
 *   - findAll: passes nextCursor through unchanged.
 *   - findAll: maps an empty result list.
 */

import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import { ExtractedDocumentQueueService } from "./extracted-document-queue.service";
import { ExtractedDocumentQueueRepository } from "../repository/extracted-document-queue.repository";
import type { ExtractedDocumentQueueEntity } from "../entities/extracted-document-queue.entity";
import {
  ExtractedDocumentQueueStatus,
} from "../entities/extracted-document-queue.entity";
import type { FindExtractedDocumentQueuesQueryDto } from "../dto/find-extracted-document-queues-query.dto";
import type { FindMyExtractedDocumentQueuesQueryDto } from "../dto/find-my-extracted-document-queues-query.dto";
import type { ExtractedDocumentQueueResponseDto } from "../dto/extracted-document-response-dto";

/**
 * Build a minimal ExtractedDocumentQueueEntity with all fields the
 * service's `toDto` reads. `uploader` can be null to test the null-coalesce.
 */
function makeEntity(overrides: Partial<ExtractedDocumentQueueEntity> = {}): ExtractedDocumentQueueEntity {
  return {
    id: "queue-id-1",
    document_file_id: "doc-file-id-1",
    document_file: {
      file_name: "doc.pdf",
      object_key: "documents/key-1",
      uploader_id: "uploader-id-1",
      uploader: {
        id: "uploader-id-1",
        full_name: "Jane Doe",
      },
    },
    extracted_data: [],
    extracted_chunks: [],
    decision: "REVIEW" as const,
    created_at: new Date("2026-10-07T12:00:00Z"),
    ...overrides,
  } as unknown as ExtractedDocumentQueueEntity;
}

function makeEntityWithoutUploader(): ExtractedDocumentQueueEntity {
  return makeEntity({
    document_file: {
      id: "df-2",
      code: "DF2",
      file_name: "orphan.pdf",
      object_key: "documents/key-2",
      uploader_id: null,
      uploader: null,
    },
    decision: "ACCEPT" as const,
    id: "queue-id-2",
  });
}

/**
 * Build the service with a mocked repository. Returns the service and the
 * mock so tests can assert on calls.
 */
async function buildService() {
  const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      ExtractedDocumentQueueService,
      { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
    ],
  }).compile();

  return {
    service: moduleRef.get(ExtractedDocumentQueueService),
    mockRepository,
  };
}

describe("ExtractedDocumentQueueService", () => {
  describe("create", () => {
    it("forwards the entity data and transaction manager to the repository", async () => {
      const { service, mockRepository } = await buildService();

      const data = { extracted_data: [], extracted_chunks: [], decision: "ACCEPT" };
      const manager = { id: "manager" } as unknown as EntityManager;
      const savedEntity = makeEntity();

      mockRepository.create!.mockResolvedValue(savedEntity);

      const result = await service.create(data, manager);

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockRepository.create).toHaveBeenCalledWith(data, manager);
      expect(result).toBe(savedEntity);
    });
  });

  describe("findAll", () => {
    it("maps each entity to a response DTO via toDto", async () => {
      const { service, mockRepository } = await buildService();

      const entity = makeEntity();
      const query = { limit: 20, sort: "newest" } as FindExtractedDocumentQueuesQueryDto;

      mockRepository.findAll = jest.fn().mockResolvedValue({
        data: [entity],
        nextCursor: "cursor-next",
      });

      const result = await service.findAll(query);

      expect(mockRepository.findAll).toHaveBeenCalledWith(query);
      expect(result.nextCursor).toBe("cursor-next");

      const dto = result.data[0] as ExtractedDocumentQueueResponseDto;
      expect(dto.id).toBe("queue-id-1");
      expect(dto.document_file_id).toBe("doc-file-id-1");
      expect(dto.file_name).toBe("doc.pdf");
      expect(dto.object_key).toBe("documents/key-1");
      expect(dto.uploader_id).toBe("uploader-id-1");
      expect(dto.uploader_name).toBe("Jane Doe");
      expect(dto.decision).toBe("REVIEW");
      expect(dto.created_at).toEqual(new Date("2026-10-07T12:00:00Z"));
    });

    it("sets uploader_name and uploader_id to null when the document has no uploader", async () => {
      const { service, mockRepository } = await buildService();

      const entity = makeEntityWithoutUploader();
      const query = {} as FindExtractedDocumentQueuesQueryDto;

      mockRepository.findAll = jest.fn().mockResolvedValue({
        data: [entity],
        nextCursor: null,
      });

      const result = await service.findAll(query);

      const dto = result.data[0] as ExtractedDocumentQueueResponseDto;
      expect(dto.uploader_id).toBeNull();
      expect(dto.uploader_name).toBeNull();
      expect(dto.decision).toBe("ACCEPT");
    });

    it("returns an empty data array when the repository has no results", async () => {
      const { service, mockRepository } = await buildService();

      mockRepository.findAll = jest.fn().mockResolvedValue({
        data: [],
        nextCursor: null,
      });

      const result = await service.findAll({} as FindExtractedDocumentQueuesQueryDto);

      expect(result.data).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it("passes nextCursor through unchanged (null when no more pages)", async () => {
      const { service, mockRepository } = await buildService();

      mockRepository.findAll = jest.fn().mockResolvedValue({
        data: [makeEntity(), makeEntityWithoutUploader()],
        nextCursor: null,
      });

      const result = await service.findAll({} as FindExtractedDocumentQueuesQueryDto);

      expect(result.data).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });
  });

  /*
   * ── findAllByUploaderId ────────────────────────────────────────────────
   *
   * Delegates to `repository.findAllByUploaderId(uploaderId, query)`, then maps
   * each entity via the private `toMyDto` (which calls resolveExtraction for
   * the `fields` field). We assert forwarding of the uploaderId + query, and
   * that nextCursor passes through.
   *
   * resolveExtraction is the domain function under its own spec; here we only
   * verify it is invoked and its `.fields` ends up on the DTO.
   */
  describe("findAllByUploaderId", () => {
    /** Extend buildService mock to include findAllByUploaderId. */
    async function buildServiceWithMy() {
      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        create: jest.fn(),
        findAll: jest.fn(),
        findAllByUploaderId: jest.fn(),
        findOneByIdWithJoin: jest.fn(),
        findOneById: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      return {
        service: moduleRef.get(ExtractedDocumentQueueService),
        mockRepository,
      };
    }

    it("forwards uploaderId and query to the repository", async () => {
      const { service, mockRepository } = await buildServiceWithMy();

      mockRepository.findAllByUploaderId = jest.fn().mockResolvedValue({
        data: [makeEntity()],
        nextCursor: "my-cursor",
      });

      const query = {
        limit: 10,
        sort: "newest",
      } as unknown as FindMyExtractedDocumentQueuesQueryDto;

      await service.findAllByUploaderId("uploader-1", query);

      expect(mockRepository.findAllByUploaderId).toHaveBeenCalledTimes(1);
      expect(mockRepository.findAllByUploaderId).toHaveBeenCalledWith(
        "uploader-1",
        query,
      );
    });

    it("maps entities to MyExtractedDocumentQueueResponseDto and passes nextCursor", async () => {
      const { service, mockRepository } = await buildServiceWithMy();

      const entity = makeEntity({
        status: ExtractedDocumentQueueStatus.PENDING,
        decision: "REVIEW",
      });

      mockRepository.findAllByUploaderId = jest.fn().mockResolvedValue({
        data: [entity],
        nextCursor: "next-cursor",
      });

      const result = await service.findAllByUploaderId(
        "uploader-1",
        {} as FindMyExtractedDocumentQueuesQueryDto,
      );

      const dto = result.data[0];
      expect(dto.id).toBe("queue-id-1");
      expect(dto.file_name).toBe("doc.pdf");
      expect(dto.decision).toBe("REVIEW");
      expect(dto.status).toBe(ExtractedDocumentQueueStatus.PENDING);
      expect(dto.created_at).toEqual(new Date("2026-10-07T12:00:00Z"));
      // resolveExtraction was invoked: fields is an array (empty since entity has no extracted_data).
      expect(Array.isArray(dto.fields)).toBe(true);
      expect(result.nextCursor).toBe("next-cursor");
    });
  });

  /*
   * ── getOrThrow ──────────────────────────────────────────────────────────
   *
   * Throws NotFoundException when repository returns null; otherwise returns
   * the entity as-is.
   */
  describe("getOrThrow", () => {
    async function buildServiceForFind(): Promise<{
      service: ExtractedDocumentQueueService;
      mockRepository: Partial<ExtractedDocumentQueueRepository>;
    }> {
      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        findOneByIdWithJoin: jest.fn(),
        findOneById: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      return {
        service: moduleRef.get(ExtractedDocumentQueueService),
        mockRepository,
      };
    }

    it("throws NotFoundException when the queue is not found", async () => {
      const { service, mockRepository } = await buildServiceForFind();

      mockRepository.findOneByIdWithJoin = jest.fn().mockResolvedValue(null);

      await expect(service.getOrThrow("missing-id")).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.findOneByIdWithJoin).toHaveBeenCalledWith(
        "missing-id",
      );
    });

    it("returns the entity when found", async () => {
      const { service, mockRepository } = await buildServiceForFind();

      const entity = makeEntity();
      mockRepository.findOneByIdWithJoin = jest.fn().mockResolvedValue(entity);

      const result = await service.getOrThrow("queue-id-1");

      expect(result).toBe(entity);
    });
  });

  /*
   * ── findOne ────────────────────────────────────────────────────────────
   *
   * Uses `findOneById` (no join) — throws NotFoundException when null.
   * Distinct from `getOrThrow` which uses the joined variant.
   */
  describe("findOne", () => {
    it("throws NotFoundException when the queue is not found", async () => {
      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        findOneById: jest.fn().mockResolvedValue(null),
        findOneByIdWithJoin: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      const service = moduleRef.get(ExtractedDocumentQueueService);

      await expect(service.findOne("ghost")).rejects.toThrow(NotFoundException);
      expect(mockRepository.findOneById).toHaveBeenCalledWith("ghost");
    });

    it("returns the entity when found", async () => {
      const entity = makeEntity();
      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        findOneById: jest.fn().mockResolvedValue(entity),
        findOneByIdWithJoin: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      const service = moduleRef.get(ExtractedDocumentQueueService);

      const result = await service.findOne("queue-id-1");
      expect(result).toBe(entity);
    });
  });

  /*
   * ── findOneForReview ───────────────────────────────────────────────────
   *
   * Calls `getOrThrow` (uses findOneByIdWithJoin) then resolveExtraction.
   * Returns an object with `fields`, `chunk_locations`, and entity metadata.
   * chunk_locations maps chunkId → { page, bbox, text, sourceConfidence, tokens }.
   */
  describe("findOneForReview", () => {
    it("resolves fields and chunk_locations from the queue entity", async () => {
      const entity = makeEntity({
        decision: "ACCEPT",
        status: ExtractedDocumentQueueStatus.APPROVED,
        document_file: {
          id: "df-review",
          code: "DFR",
          file_name: "review.pdf",
          object_key: "documents/review",
          uploader_id: "u-1",
          uploader: { id: "u-1", full_name: "Reviewer" } as never,
        } as never,
        extracted_data: [{ field: "subject", value: "Hello", chunkIds: ["c1"], aiConfidence: 95 }],
        extracted_chunks: [
          {
            chunkId: "c1",
            text: "Subject: Hello",
            sourceConfidence: 90,
            page: 2,
            bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
          },
        ],
      });

      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        findOneByIdWithJoin: jest.fn().mockResolvedValue(entity),
        findOneById: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      const service = moduleRef.get(ExtractedDocumentQueueService);

      const result = await service.findOneForReview("queue-id-1");

      expect(result.id).toBe("queue-id-1");
      expect(result.file_name).toBe("review.pdf");
      expect(result.uploader_name).toBe("Reviewer");
      expect(result.decision).toBe("ACCEPT");
      expect(result.status).toBe(ExtractedDocumentQueueStatus.APPROVED);

      // resolveExtraction ran on the field data — 1 field resolved, effectiveConfidence present.
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].effectiveConfidence).toBe(86); // 95 * 90 / 100 = 85.5 → 86

      // chunk_locations maps chunkId → geometry.
      expect(result.chunk_locations.c1).toEqual({
        page: 2,
        bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
        text: "Subject: Hello",
        sourceConfidence: 90,
      });
    });

    it("omits chunk_locations entries for chunks without page + bbox", async () => {
      const entity = makeEntity({
        extracted_data: [{ field: "subject", value: "Hello", chunkIds: ["c1"], aiConfidence: 95 }],
        extracted_chunks: [
          {
            chunkId: "c1",
            text: "text",
            sourceConfidence: 90,
            page: 0, // falsy → skipped
            bbox: undefined as unknown as never, // falsy → skipped
          },
        ],
      });

      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        findOneByIdWithJoin: jest.fn().mockResolvedValue(entity),
        findOneById: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      const service = moduleRef.get(ExtractedDocumentQueueService);

      const result = await service.findOneForReview("queue-id-1");

      expect(Object.keys(result.chunk_locations)).toHaveLength(0);
    });

    it("propagates NotFoundException from getOrThrow", async () => {
      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        findOneByIdWithJoin: jest.fn().mockResolvedValue(null),
        findOneById: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      const service = moduleRef.get(ExtractedDocumentQueueService);

      await expect(service.findOneForReview("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /*
   * ── approveIfPending ───────────────────────────────────────────────────
   *
   * Uses `findOneForUpdate` to lock the row. Throws NotFoundException if absent,
   * ConflictException if status !== PENDING. Updates status to APPROVED on success
   * and returns the (stale) queue entity.
   */
  describe("approveIfPending", () => {
    async function buildServiceForApprove() {
      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        findOneForUpdate: jest.fn(),
        updateStatus: jest.fn(),
        findOneByIdWithJoin: jest.fn(),
        findOneById: jest.fn(),
        delete: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      return {
        service: moduleRef.get(ExtractedDocumentQueueService),
        mockRepository,
      };
    }

    it("throws NotFoundException when queue is absent", async () => {
      const { service, mockRepository } = await buildServiceForApprove();

      mockRepository.findOneForUpdate = jest.fn().mockResolvedValue(null);
      const manager = {} as EntityManager;

      await expect(
        service.approveIfPending("missing", manager),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException when status is not PENDING", async () => {
      const { service, mockRepository } = await buildServiceForApprove();

      mockRepository.findOneForUpdate = jest.fn().mockResolvedValue(
        makeEntity({ status: ExtractedDocumentQueueStatus.APPROVED }),
      );
      const manager = {} as EntityManager;

      await expect(
        service.approveIfPending("queue-id-1", manager),
      ).rejects.toThrow(ConflictException);
      // No status update should occur on conflict.
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it("updates status to APPROVED and forwards the manager when pending", async () => {
      const { service, mockRepository } = await buildServiceForApprove();

      const entity = makeEntity({ status: ExtractedDocumentQueueStatus.PENDING });
      mockRepository.findOneForUpdate = jest.fn().mockResolvedValue(entity);
      mockRepository.updateStatus = jest.fn().mockResolvedValue(true);
      const manager = {} as EntityManager;

      const result = await service.approveIfPending("queue-id-1", manager);

      expect(result).toBe(entity);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        "queue-id-1",
        ExtractedDocumentQueueStatus.APPROVED,
        manager,
      );
    });
  });

  /*
   * ── delete ─────────────────────────────────────────────────────────────
   *
   * Throws NotFoundException when repository returns falsy; otherwise no throw.
   * Optional manager is forwarded.
   */
  describe("delete", () => {
    it("throws NotFoundException when repository reports no rows affected", async () => {
      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        delete: jest.fn().mockResolvedValue(false),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      const service = moduleRef.get(ExtractedDocumentQueueService);

      await expect(service.delete("ghost")).rejects.toThrow(NotFoundException);
      expect(mockRepository.delete).toHaveBeenCalledWith("ghost", undefined);
    });

    it("forwards the optional manager and does not throw on success", async () => {
      const mockRepository: Partial<ExtractedDocumentQueueRepository> = {
        delete: jest.fn().mockResolvedValue(true),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractedDocumentQueueService,
          { provide: ExtractedDocumentQueueRepository, useValue: mockRepository },
        ],
      }).compile();

      const service = moduleRef.get(ExtractedDocumentQueueService);
      const manager = {} as EntityManager;

      await expect(service.delete("queue-id-1", manager)).resolves.toBeUndefined();
      expect(mockRepository.delete).toHaveBeenCalledWith("queue-id-1", manager);
    });
  });
});
