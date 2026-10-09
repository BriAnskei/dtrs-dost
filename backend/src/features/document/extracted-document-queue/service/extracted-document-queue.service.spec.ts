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

import { Test } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import { ExtractedDocumentQueueService } from "./extracted-document-queue.service";
import { ExtractedDocumentQueueRepository } from "../repository/extracted-document-queue.repository";
import type { ExtractedDocumentQueueEntity } from "../entities/extracted-document-queue.entity";
import type { FindExtractedDocumentQueuesQueryDto } from "../dto/find-extracted-document-queues-query.dto";
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
});
