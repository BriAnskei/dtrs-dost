/**
 * Unit tests for `InvalidateExtractedDocumentQueueUseCase`.
 *
 * THE USE CASE (use-cases/invalidate-extracted-document-queue.usecase.ts):
 *
 *   execute(input: { queueId: string; response?: string }): Promise<{ id, status, invalidation_response }>
 *
 * Inside a DataSource transaction:
 *   1. `queueRepository.findOneForUpdate(queueId, manager)` — locks the row.
 *   2. Throws NotFoundException if absent.
 *   3. Throws ConflictException if status !== PENDING.
 *   4. Loads the DocumentFileEntity via `documentFileService.findById`.
 *   5. `queueRepository.updateStatus(queueId, INVALIDATED, manager)`.
 *   6. If `input.response` provided → `invalidationResponseRepository.create(...)`.
 *      Else → invalidation_response is null.
 *   7. Returns { id, objectKey, status, invalidation_response }.
 *
 * Outside the transaction, ALWAYS deletes the S3 object at objectKey.
 *
 * SCENARIOS:
 *   - Invalidates a PENDING queue with a response string.
 *   - Invalidates without a response (invalidation_response = null but S3 still deleted).
 *   - NotFoundException when queue absent.
 *   - ConflictException when status is APPROVED / INVALIDATED.
 *   - S3 delete called with the loaded document_file.object_key.
 *   - Transaction error propagates (mock rejects).
 */

import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource, EntityManager } from "typeorm";
import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueRepository } from "../repository/extracted-document-queue.repository";
import { InvalidationResponseRepository } from "../repository/invalidation-response.repository";
import { DocumentFileService } from "../../document-file/service/document-file.service";
import { S3Service } from "../../../../storage/s3/s3.service";
import { InvalidateExtractedDocumentQueueUseCase } from "./invalidate-extracted-document-queue.usecase";

/**
 * Build a mock queue row. `status` controls whether invalidate is allowed.
 */
function makeQueue(overrides: Record<string, unknown> = {}) {
  return {
    id: "queue-1",
    document_file_id: "docfile-1",
    document_file: {
      object_key: "incoming/2026/01/file.pdf",
      file_name: "file.pdf",
    },
    status: ExtractedDocumentQueueStatus.PENDING,
    decision: "REVIEW",
    created_at: new Date(),
    ...overrides,
  };
}

/**
 * Build the use case with all collaborators mocked.
 * Pass `transactionShouldFail` to simulate an error inside the transaction
 * (the mock callback throws). Pass `findOneForUpdateReturns` to control
 * the queue returned by the repository.
 */
async function buildUseCase(opts: {
  transactionShouldFail?: boolean;
  oneNotFound?: boolean;
  queueStatus?: ExtractedDocumentQueueStatus;
} = {}) {
  const mockQueueRepository: Partial<ExtractedDocumentQueueRepository> = {
    findOneForUpdate: opts.oneNotFound
      ? jest.fn().mockResolvedValue(null)
      : jest.fn().mockResolvedValue(
          makeQueue(opts.queueStatus ? { status: opts.queueStatus } : {}),
        ),
    updateStatus: jest.fn().mockResolvedValue(true),
  };

  const mockDocumentFileService: Partial<DocumentFileService> = {
    findById: jest.fn().mockResolvedValue({
      object_key: "incoming/2026/01/file.pdf",
    }),
  };

  const mockInvalidationResponseRepository: Partial<InvalidationResponseRepository> = {
    create: jest.fn().mockResolvedValue({
      id: "invalidation-1",
      response: "bad scan",
      created_at: new Date(),
    }),
  };

  const mockS3Service: Partial<S3Service> = {
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource: Partial<DataSource> = {
    transaction: jest.fn().mockImplementation(async (cb) => {
      if (opts.transactionShouldFail) {
        throw new Error("Transaction rolled back");
      }
      return cb({} as EntityManager);
    }),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      InvalidateExtractedDocumentQueueUseCase,
      { provide: DataSource, useValue: mockDataSource },
      { provide: ExtractedDocumentQueueRepository, useValue: mockQueueRepository },
      { provide: DocumentFileService, useValue: mockDocumentFileService },
      { provide: InvalidationResponseRepository, useValue: mockInvalidationResponseRepository },
      { provide: S3Service, useValue: mockS3Service },
    ],
  }).compile();

  return {
    useCase: moduleRef.get(InvalidateExtractedDocumentQueueUseCase),
    mockQueueRepository,
    mockDocumentFileService,
    mockInvalidationResponseRepository,
    mockS3Service,
    mockDataSource,
  };
}

describe("InvalidateExtractedDocumentQueueUseCase", () => {
  describe("success path", () => {
    it("invalidates a PENDING queue, records an invalidation response, and deletes the S3 file", async () => {
      const {
        useCase,
        mockQueueRepository,
        mockDocumentFileService,
        mockInvalidationResponseRepository,
        mockS3Service,
        mockDataSource,
      } = await buildUseCase();

      const result = await useCase.execute({
        queueId: "queue-1",
        response: "poor quality scan",
      });

      // Repository: lock row, then set status.
      expect(mockQueueRepository.findOneForUpdate).toHaveBeenCalledTimes(1);
      expect(mockQueueRepository.updateStatus).toHaveBeenCalledWith(
        "queue-1",
        ExtractedDocumentQueueStatus.INVALIDATED,
        expect.any(Object),
      );

      // Document file loaded (inside transaction).
      expect(mockDocumentFileService.findById).toHaveBeenCalledWith(
        "docfile-1",
        expect.any(Object),
      );

      // Invalidation response persisted when `response` provided.
      expect(mockInvalidationResponseRepository.create).toHaveBeenCalledWith(
        {
          extracted_document_queue_id: "queue-1",
          response: "poor quality scan",
        },
        expect.any(Object),
      );

      // S3 object deleted after transaction completes.
      expect(mockS3Service.delete).toHaveBeenCalledTimes(1);
      expect(mockS3Service.delete).toHaveBeenCalledWith(
        "incoming/2026/01/file.pdf",
      );

      // Return shape.
      expect(result).toEqual({
        id: "queue-1",
        status: ExtractedDocumentQueueStatus.INVALIDATED,
        invalidation_response: {
          id: "invalidation-1",
          response: "bad scan",
          created_at: expect.any(Date),
        },
      });
    });

    it("invalidates without a response — invalidation_response is null but S3 still deleted", async () => {
      const {
        useCase,
        mockInvalidationResponseRepository,
        mockS3Service,
      } = await buildUseCase();

      const result = await useCase.execute({ queueId: "queue-1" });

      expect(mockInvalidationResponseRepository.create).not.toHaveBeenCalled();
      expect(result.invalidation_response).toBeNull();
      expect(result.status).toBe(ExtractedDocumentQueueStatus.INVALIDATED);

      // S3 cleanup still happens even without a response.
      expect(mockS3Service.delete).toHaveBeenCalledWith(
        "incoming/2026/01/file.pdf",
      );
    });
  });

  describe("error paths", () => {
    it("throws NotFoundException when the queue id does not exist", async () => {
      const { useCase } = await buildUseCase({ oneNotFound: true });

      await expect(useCase.execute({ queueId: "missing" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each([
      ExtractedDocumentQueueStatus.APPROVED,
      ExtractedDocumentQueueStatus.INVALIDATED,
    ])("throws ConflictException when status is %s", async (status) => {
      const { useCase, mockDataSource } = await buildUseCase({ queueStatus: status });

      await expect(
        useCase.execute({ queueId: "queue-1" }),
      ).rejects.toThrow(ConflictException);

      // No transaction body should commit — updateStatus was never reached.
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it("propagates errors thrown inside the transaction", async () => {
      const { useCase } = await buildUseCase({ transactionShouldFail: true });

      await expect(
        useCase.execute({ queueId: "queue-1", response: "x" }),
      ).rejects.toThrow("Transaction rolled back");
    });
  });
});
