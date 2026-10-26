/**
 * Unit tests for `GetDocumentFileStreamUseCase`.
 *
 * THE USE CASE (use-cases/get-document-file-stream.usecase.ts):
 *
 *   execute(id: string): Promise<{ stream: Readable; filename: string }>
 *
 *   1. `extractedDocumentQueueService.getOrThrow(id)` — loads the queue (with
 *      joined document_file.uploader) or throws NotFoundException.
 *   2. `s3Service.get(queue.document_file.object_key)` — fetches from S3.
 *   3. Returns { stream: object.Body as Readable, filename: object.file_name }.
 *
 * SCENARIOS:
 *   - Happy path: returns the S3 stream + the file_name from the joined entity.
 *   - getOrThrow throws NotFoundException → propagated.
 *   - S3 get receives the correct object_key.
 */

import { NotFoundException } from "@nestjs/common";
import { Readable } from "node:stream";
import { Test } from "@nestjs/testing";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";
import { S3Service } from "../../../../storage/s3/s3.service";
import { GetDocumentFileStreamUseCase } from "./get-document-file-stream.usecase";

async function buildUseCase(opts: {
  queueNotFound?: boolean;
} = {}) {
  const mockEntity = {
    id: "queue-1",
    document_file: {
      object_key: "incoming/2026/01/report.pdf",
      file_name: "report.pdf",
      uploader_id: "u-1",
      uploader: { id: "u-1", full_name: "Jane" },
    },
    status: "PENDING",
    decision: "REVIEW",
    created_at: new Date(),
  };

  const mockService: Partial<ExtractedDocumentQueueService> = {
    getOrThrow: opts.queueNotFound
      ? jest.fn().mockRejectedValue(new NotFoundException("not found"))
      : jest.fn().mockResolvedValue(mockEntity),
  };

  const fakeStream = new Readable({ read() {} });
  fakeStream.push(Buffer.from("pdf-bytes"));
  fakeStream.push(null);

  const mockS3Service: Partial<S3Service> = {
    get: jest.fn().mockResolvedValue({
      Body: fakeStream,
    }),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      GetDocumentFileStreamUseCase,
      { provide: ExtractedDocumentQueueService, useValue: mockService },
      { provide: S3Service, useValue: mockS3Service },
    ],
  }).compile();

  return {
    useCase: moduleRef.get(GetDocumentFileStreamUseCase),
    mockService,
    mockS3Service,
    fakeStream,
    mockEntity,
  };
}

describe("GetDocumentFileStreamUseCase", () => {
  it("loads the queue, fetches the S3 object by object_key, and returns the stream + filename", async () => {
    const { useCase, mockService, mockS3Service, fakeStream, mockEntity } = await buildUseCase();

    const result = await useCase.execute("queue-1");

    expect(mockService.getOrThrow).toHaveBeenCalledWith("queue-1");
    expect(mockS3Service.get).toHaveBeenCalledWith(
      mockEntity.document_file.object_key,
    );
    expect(result.stream).toBe(fakeStream);
    expect(result.filename).toBe("report.pdf");
  });

  it("propagates NotFoundException when the queue is absent", async () => {
    const { useCase, mockS3Service } = await buildUseCase({ queueNotFound: true });

    await expect(useCase.execute("missing")).rejects.toThrow(NotFoundException);
    expect(mockS3Service.get).not.toHaveBeenCalled();
  });
});
