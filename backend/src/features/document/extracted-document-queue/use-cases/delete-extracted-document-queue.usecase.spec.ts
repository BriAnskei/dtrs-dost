/**
 * Unit tests for `DeleteExtractedDocumentQueueUseCase`.
 *
 * THE USE CASE (use-cases/delete-extracted-document-queue.usecase.spec.ts):
 *
 *   execute(queueId: string): Promise<void>
 *
 *   1. `extractedDocumentQueueService.getOrThrow(queueId)` to load + join.
 *      (Throws NotFoundException if absent.)
 *   2. DataSource.transaction:
 *      a. `extractedDocumentQueueService.delete(queue.id, manager)` — soft-ish
 *         DB delete.
 *      b. If status === PENDING OR status === INVALIDATED:
 *         `documentFileService.delete(queue.document_file_id, manager)` and
 *         set `deleteFileRequired = true`.
 *      c. Returns { deleteFileRequired }.
 *   3. If `deleteFileRequired`: `s3Service.delete(queue.document_file.object_key)`.
 *   4. catch: console.error + rethrow.
 *
 * SCENARIOS:
 *   - PENDING: deletes document file in DB + S3 object.
 *   - INVALIDATED: same as PENDING.
 *   - APPROVED: deletes queue row only, NO S3 delete.
 *   - Repository throws → error propagated (console.error called).
 */

import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource, EntityManager } from "typeorm";
import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";
import { DocumentFileService } from "../../document-file/service/document-file.service";
import { S3Service } from "../../../../storage/s3/s3.service";
import { DeleteExtractedDocumentQueueUseCase } from "./delete-extracted-document-queue.usecase";

/** Build a queue entity with the given status. */
function makeQueue(status: ExtractedDocumentQueueStatus) {
  return {
    id: "queue-1",
    document_file_id: "docfile-1",
    document_file: {
      object_key: "incoming/2026/01/file.pdf",
      file_name: "file.pdf",
    },
    status,
    decision: "REVIEW",
    created_at: new Date(),
  };
}

async function buildUseCase(opts: {
  queue?: ReturnType<typeof makeQueue>;
  transactionShouldFail?: boolean;
} = {}) {
  const queue = opts.queue ?? makeQueue(ExtractedDocumentQueueStatus.PENDING);

  const mockService: Partial<ExtractedDocumentQueueService> = {
    getOrThrow: jest.fn().mockResolvedValue(queue),
    delete: opts.transactionShouldFail
      ? jest.fn().mockRejectedValue(new Error("DB delete failed"))
      : jest.fn().mockResolvedValue(true),
  };

  const mockDocumentFileService: Partial<DocumentFileService> = {
    delete: jest.fn().mockResolvedValue(true),
  };

  const mockS3Service: Partial<S3Service> = {
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource: Partial<DataSource> = {
    transaction: jest.fn().mockImplementation(async (cb) => cb({} as EntityManager)),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      DeleteExtractedDocumentQueueUseCase,
      { provide: DataSource, useValue: mockDataSource },
      { provide: ExtractedDocumentQueueService, useValue: mockService },
      { provide: DocumentFileService, useValue: mockDocumentFileService },
      { provide: S3Service, useValue: mockS3Service },
    ],
  }).compile();

  return {
    useCase: moduleRef.get(DeleteExtractedDocumentQueueUseCase),
    mockService,
    mockDocumentFileService,
    mockS3Service,
    mockDataSource,
    queue,
  };
}

describe("DeleteExtractedDocumentQueueUseCase", () => {
  describe("success path", () => {
    it("deletes the document file in DB and the S3 object when status is PENDING", async () => {
      const {
        useCase,
        mockService,
        mockDocumentFileService,
        mockS3Service,
        mockDataSource,
      } = await buildUseCase({ queue: makeQueue(ExtractedDocumentQueueStatus.PENDING) });

      await useCase.execute("queue-1");

      expect(mockService.getOrThrow).toHaveBeenCalledWith("queue-1");
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockService.delete).toHaveBeenCalledWith(
        "queue-1",
        expect.any(Object),
      );
      expect(mockDocumentFileService.delete).toHaveBeenCalledWith(
        "docfile-1",
        expect.any(Object),
      );
      expect(mockS3Service.delete).toHaveBeenCalledWith(
        "incoming/2026/01/file.pdf",
      );
    });

    it("also deletes the file when status is INVALIDATED", async () => {
      const { useCase, mockDocumentFileService, mockS3Service } = await buildUseCase({
        queue: makeQueue(ExtractedDocumentQueueStatus.INVALIDATED),
      });

      await useCase.execute("queue-1");

      expect(mockDocumentFileService.delete).toHaveBeenCalledTimes(1);
      expect(mockS3Service.delete).toHaveBeenCalledTimes(1);
    });

    it("does NOT delete the document file or S3 object when status is APPROVED", async () => {
      const { useCase, mockDocumentFileService, mockS3Service } = await buildUseCase({
        queue: makeQueue(ExtractedDocumentQueueStatus.APPROVED),
      });

      await useCase.execute("queue-1");

      // Queue row still deleted, but no file/S3 cleanup.
      expect(mockDocumentFileService.delete).not.toHaveBeenCalled();
      expect(mockS3Service.delete).not.toHaveBeenCalled();
    });
  });

  describe("error paths", () => {
    it("propagates NotFoundException when getOrThrow cannot find the queue", async () => {
      const mockService: Partial<ExtractedDocumentQueueService> = {
        getOrThrow: jest.fn().mockRejectedValue(new NotFoundException()),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          DeleteExtractedDocumentQueueUseCase,
          { provide: DataSource, useValue: { transaction: jest.fn() } },
          { provide: ExtractedDocumentQueueService, useValue: mockService },
          { provide: DocumentFileService, useValue: { delete: jest.fn() } },
          { provide: S3Service, useValue: { delete: jest.fn() } },
        ],
      }).compile();

      const useCase = moduleRef.get(DeleteExtractedDocumentQueueUseCase);

      await expect(useCase.execute("missing")).rejects.toThrow(NotFoundException);
    });

    it("propagates and logs errors from the transaction body", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

      const { useCase } = await buildUseCase({ transactionShouldFail: true });

      await expect(useCase.execute("queue-1")).rejects.toThrow("DB delete failed");
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });
});
