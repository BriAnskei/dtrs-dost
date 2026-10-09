/**
 * Unit tests for `ExtractedDocumentQueueUseCase` — the backend use-case that
 * orchestrates receiving a document from the receiver role.
 *
 * THE USE CASE (use-cases/extracted-document-queue.usecase.ts):
 *
 *   class ExtractedDocumentQueueUseCase
 *
 *   receiveDocument(file, dto, user_id): Promise<ReceiveDocumentResponse>
 *
 * It:
 *   1. Calls `extractionService.extract(...)` to get LLM-extracted fields.
 *   2. Generates an S3 object key, uploads the file buffer via `s3Service`.
 *   3. Opens a TypeORM transaction that:
 *      a. Creates a DocumentFileEntity via `documentFileService.create(...)`.
 *      b. Creates an ExtractedDocumentQueueEntity via
 *         `extractedDocumentQueueService.create(...)` — persisting the raw
 *         extracted_data, extracted_chunks, and a `decision` computed by
 *         `resolveDecision`.
 *      c. Returns `resolveExtraction(...)` (computes effectiveConfidence per
 *         field + final ACCEPT/REVIEW/INVALID decision for the client).
 *   4. On transaction failure, deletes the S3 object (cleanup) and rethrows.
 *
 * KEY BEHAVIORS TESTED:
 *   - `resolveExtraction` — effectiveConfidence = round(aiConfidence * minSourceConfidence / 100).
 *   - `resolveDecision` — INVALID if any field value is null / aiConfidence null / effective null;
 *     ACCEPT if min effective >= 90; REVIEW otherwise.
 *   - S3 upload happens BEFORE the transaction.
 *   - S3 cleanup fires when the transaction throws.
 *   - S3 cleanup swallows its own errors (logs only) and rethrows the original.
 *   - user_id is forwarded to documentFileService as uploader_id.
 *   - The decision persisted to the queue entity matches the resolved decision.
 */

import { Test } from "@nestjs/testing";
import { DataSource, EntityManager } from "typeorm";

// uuid@14 is ESM-only and Jest cannot parse it. Mock the v4 function so it
// returns a unique value per call — the use-case only needs a string to build
// the S3 object key.
jest.mock("uuid", () => ({
  v4: jest.fn(() => `uuid-${Math.random().toString(36).slice(2)}`),
}));

import { ExtractedDocumentQueueUseCase } from "./extracted-document-queue.usecase";
import type {
  ExtractedChunk,
  ExtractedDocumentField,
  ReceiveDocumentResponse,
} from "../types/extracted-types";
import type { CreateExtractedDocumentDto } from "../dto/create-extracted-document-dto";
import { ExtractionService } from "../../extraction/extraction.service";
import { DocumentFileService } from "../../document-file/document-file.service";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";
import { S3Service } from "../../../../storage/s3/s3.service";
import type { Decision } from "../extraction-queue.constant";

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Build an ExtractedField (LLM-extractor output shape). */
function makeField(
  field: string,
  value: string | null,
  chunkIds: string[],
  aiConfidence: number | null,
) {
  return { field, value, chunkIds, aiConfidence };
}

/** Build an ExtractedChunk (receiver-side chunk with source confidence). */
function makeChunk(
  chunkId: string,
  text: string,
  sourceConfidence: number,
): ExtractedChunk {
  return { chunkId, text, sourceConfidence };
}

/** A fake Express Multer file for the file upload param. */
function makeMulterFile(): Express.Multer.File {
  return {
    originalname: "test.pdf",
    buffer: Buffer.from("pdf-bytes"),
    mimetype: "application/pdf",
  } as Express.Multer.File;
}

/** A minimal CreateExtractedDocumentDto with the required chunks. */
function makeDto(chunks?: ExtractedChunk[]): CreateExtractedDocumentDto {
  return {
    chunks: chunks ?? [makeChunk("c1", "Subject: Foo", 95)],
  } as unknown as CreateExtractedDocumentDto;
}

/**
 * Build a mock Entity manager (empty object — the mock services don't use it).
 */
function makeMockManager(): EntityManager {
  return {} as EntityManager;
}

/**
 * Build the use-case with all collaborators mocked.
 *
 * The DataSource mock's `transaction` simply invokes the callback the use-case
 * passes to it — this means the REAL `resolveExtraction` and `resolveDecision`
 * logic in the use-case executes, ensuring we test the actual code.
 *
 * Set `transactionShouldFail` to make `documentFileService.create` reject,
 * which triggers the use-case's catch block (S3 cleanup + rethrow).
 */
async function buildUseCase(opts: {
  transactionShouldFail?: boolean;
  s3DeleteShouldFail?: boolean;
} = {}) {
  const mockExtractedFields = [
    makeField("subject", "Foo", ["c1"], 90),
    makeField("from", "Bar", ["c1"], 95),
    makeField("to", null, [], null),
    makeField("dateReceived", "10/03/2026", ["c1"], 88),
    makeField("summary", "Summary text", ["c1"], 85),
  ];

  const mockExtractionService: Partial<ExtractionService> = {
    extract: jest.fn().mockResolvedValue({ fields: mockExtractedFields }),
  };

  const mockDocumentFileEntity = {
    id: "doc-file-id",
    file_name: "test.pdf",
    object_key: "documents/some-key",
    uploader_id: "user-123",
  };

  const mockDocumentFileService: Partial<DocumentFileService> = {
    create: opts.transactionShouldFail
      ? jest.fn().mockRejectedValue(new Error("Transaction failed"))
      : jest.fn().mockResolvedValue(mockDocumentFileEntity),
  };

  const mockExtractedDocumentQueueService: Partial<ExtractedDocumentQueueService> = {
    create: jest.fn().mockResolvedValue({ id: "queue-id" }),
  };

  const mockS3Service: Partial<S3Service> = {
    upload: jest.fn().mockResolvedValue(undefined),
    delete: opts.s3DeleteShouldFail
      ? jest.fn().mockRejectedValue(new Error("S3 delete failed"))
      : jest.fn().mockResolvedValue(undefined),
  };

  // The DataSource.transaction mock invokes the callback that the use-case
  // passes in. The callback runs the REAL use-case logic (resolveExtraction,
  // resolveDecision, documentFileService.create, etc.).
  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (cb: (manager: EntityManager) => Promise<unknown>) =>
      cb({} as EntityManager),
    ),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      ExtractedDocumentQueueUseCase,
      { provide: DataSource, useValue: mockDataSource },
      { provide: ExtractionService, useValue: mockExtractionService },
      { provide: DocumentFileService, useValue: mockDocumentFileService },
      { provide: ExtractedDocumentQueueService, useValue: mockExtractedDocumentQueueService },
      { provide: S3Service, useValue: mockS3Service },
    ],
  }).compile();

  const useCase = moduleRef.get(ExtractedDocumentQueueUseCase);

  return {
    useCase,
    mockExtractionService,
    mockDocumentFileService,
    mockExtractedDocumentQueueService,
    mockS3Service,
    mockDataSource,
    mockExtractedFields,
    mockExtractedChunks: [makeChunk("c1", "Subject: Foo", 95)] as ExtractedChunk[],
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("ExtractedDocumentQueueUseCase", () => {
  describe("receiveDocument — success path", () => {
    it("extracts fields, uploads to S3 before the transaction, writes to DB, and returns the resolved response", async () => {
      const {
        useCase,
        mockExtractionService,
        mockS3Service,
        mockDataSource,
        mockDocumentFileService,
        mockExtractedDocumentQueueService,
      } = await buildUseCase();

      const file = makeMulterFile();
      const dto = makeDto();

      const response = await useCase.receiveDocument(file, dto, "user-123");

      // 1. Extraction was called with "incoming" document type and the chunks.
      expect(mockExtractionService.extract).toHaveBeenCalledTimes(1);
      expect(mockExtractionService.extract).toHaveBeenCalledWith({
        documentType: "incoming",
        chunks: dto.chunks,
      });

      // 2. S3 upload happened BEFORE the transaction, with the file buffer.
      expect(mockS3Service.upload).toHaveBeenCalledTimes(1);
      expect(mockS3Service.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^documents\//),
        file.buffer,
        file.mimetype,
      );

      // 3. A transaction was opened.
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);

      // 4. DocumentFileEntity was created with the right shape + uploader_id.
      expect(mockDocumentFileService.create).toHaveBeenCalledTimes(1);
      expect(mockDocumentFileService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_name: file.originalname,
          uploader_id: "user-123",
        }),
        expect.any(Object),
      );

      // 5. Queue entity was created with extracted_data, chunks, and a decision.
      expect(mockExtractedDocumentQueueService.create).toHaveBeenCalledTimes(1);
      const createArg = mockExtractedDocumentQueueService.create!.mock.calls[0][0];
      expect(createArg.extracted_chunks).toBe(dto.chunks);
      expect(createArg.extracted_data).toHaveLength(5);
      expect(createArg.decision).toMatch(/^(ACCEPT|REVIEW|INVALID)$/);

      // 6. Response shape from resolveExtraction.
      expect(response.decision).toMatch(/^(ACCEPT|REVIEW|INVALID)$/);
      expect(response.fields).toHaveLength(5);
    });

    it("generates a unique S3 object key per upload", async () => {
      const { useCase, mockS3Service } = await buildUseCase();

      await useCase.receiveDocument(makeMulterFile(), makeDto(), "u1");
      await useCase.receiveDocument(makeMulterFile(), makeDto(), "u2");

      const keys = mockS3Service.upload!.mock.calls.map((c) => c[0]);
      expect(keys[0]).not.toBe(keys[1]);
      expect(keys.every((k) => typeof k === "string" && k.startsWith("documents/"))).toBe(true);
    });

    it("forwards the uploaded file's originalname to the document file", async () => {
      const { useCase, mockDocumentFileService } = await buildUseCase();

      const file = makeMulterFile();
      await useCase.receiveDocument(file, makeDto(), "user-123");

      expect(mockDocumentFileService.create).toHaveBeenCalledWith(
        expect.objectContaining({ file_name: file.originalname }),
        expect.any(Object),
      );
    });

    it("passes the S3 object key to the document file entity", async () => {
      const { useCase, mockDocumentFileService, mockS3Service } = await buildUseCase();

      const file = makeMulterFile();
      await useCase.receiveDocument(file, makeDto(), "user-123");

      const s3Key = mockS3Service.upload!.mock.calls[0][0];
      expect(mockDocumentFileService.create).toHaveBeenCalledWith(
        expect.objectContaining({ object_key: s3Key }),
        expect.any(Object),
      );
    });
  });

  /*
   * ── resolveExtraction: effectiveConfidence ─────────────────────────────
   *
   * effectiveConfidence = round(aiConfidence * minSourceConfidence / 100)
   *
   * sourceConfidence for a field = the MIN sourceConfidence across all of the
   * field's cited chunks. The chunks map (chunkId → sourceConfidence) is built
   * from dto.chunks, NOT from the extraction result.
   */
  describe("resolveExtraction — effective confidence", () => {
    it("computes effectiveConfidence = round(aiConfidence * sourceConfidence / 100) for a single cited chunk", async () => {
      /*
       * Field: aiConfidence=90, cited chunk "c1" has sourceConfidence=95.
       * effective = round(90 * 95 / 100) = round(85.5) = 86.
       */
      const { useCase, mockExtractionService } = await buildUseCase();

      const fields = [
        makeField("subject", "Foo", ["c1"], 90),
        makeField("from", null, [], null),
        makeField("to", null, [], null),
        makeField("dateReceived", null, [], null),
        makeField("summary", null, [], null),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto([makeChunk("c1", "text", 95)]),
        "user-123",
      );

      const subject = response.fields.find((f) => f.field === "subject")!;
      expect(subject.effectiveConfidence).toBe(86);
      expect(subject.sourceConfidence).toBe(95);
      expect(subject.aiConfidence).toBe(90);
    });

    it("uses the MIN source confidence when a field cites multiple chunks", async () => {
      /*
       * Field cites ["c1", "c2"]. c1 has sourceConf=95, c2 has sourceConf=80.
       * min(95, 80) = 80. effective = round(90 * 80 / 100) = 72.
       */
      const { useCase, mockExtractionService } = await buildUseCase();

      const fields = [
        makeField("subject", "Foo", ["c1", "c2"], 90),
        makeField("from", null, [], null),
        makeField("to", null, [], null),
        makeField("dateReceived", null, [], null),
        makeField("summary", null, [], null),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });
      const chunks: ExtractedChunk[] = [
        makeChunk("c1", "text", 95),
        makeChunk("c2", "text", 80),
      ];

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto(chunks),
        "user-123",
      );

      const subject = response.fields.find((f) => f.field === "subject")!;
      expect(subject.sourceConfidence).toBe(80);
      expect(subject.effectiveConfidence).toBe(72);
    });

    it("returns effectiveConfidence = null when a cited chunkId is missing from chunks", async () => {
      /*
       * Field cites "c999" which doesn't exist in dto.chunks → sourceConfidences
       * is empty → effectiveConfidence = null → decision = INVALID.
       */
      const { useCase, mockExtractionService } = await buildUseCase();

      const fields = [
        makeField("subject", "Foo", ["c999"], 90),
        makeField("from", null, [], null),
        makeField("to", null, [], null),
        makeField("dateReceived", null, [], null),
        makeField("summary", null, [], null),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto([makeChunk("c1", "text", 95)]),
        "user-123",
      );

      const subject = response.fields.find((f) => f.field === "subject")!;
      expect(subject.sourceConfidence).toBeNull();
      expect(subject.effectiveConfidence).toBeNull();
    });

    it("rounds effectiveConfidence to the nearest integer", async () => {
      /*
       * aiConfidence=90, sourceConfidence=96 → 90*96/100 = 86.4 → round → 86.
       */
      const { useCase, mockExtractionService } = await buildUseCase();

      const fields = [
        makeField("subject", "Foo", ["c1"], 90),
        makeField("from", null, [], null),
        makeField("to", null, [], null),
        makeField("dateReceived", null, [], null),
        makeField("summary", null, [], null),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto([makeChunk("c1", "text", 96)]),
        "user-123",
      );

      const subject = response.fields.find((f) => f.field === "subject")!;
      expect(subject.effectiveConfidence).toBe(86);
    });
  });

  /*
   * ── resolveDecision: ACCEPT / REVIEW / INVALID ───────────────────────
   *
   * Constants: ACCEPT_CONFIDENCE_THRESHOLD = 90.
   *
   * - Any field with value === null → INVALID.
   * - Any field with aiConfidence === null (while value !== null) → INVALID
   *   (this covers LLM anti-hallucination nulls from ExtractionService).
   * - effectiveConfidence === null (cited chunk missing) → INVALID.
   * - min effectiveConfidence >= 90 → ACCEPT.
   * - min effectiveConfidence < 90 → REVIEW.
   */
  describe("resolveDecision — ACCEPT / REVIEW / INVALID", () => {
    it("returns ACCEPT when all fields have effectiveConfidence >= 90", async () => {
      const { useCase, mockExtractionService } = await buildUseCase();

      // All 5 fields present; aiConfidence=95, sourceConfidence=95 → 90.
      const fields = [
        makeField("subject", "Foo", ["c1"], 95),
        makeField("from", "Bar", ["c1"], 95),
        makeField("to", "Baz", ["c1"], 95),
        makeField("dateReceived", "10/03/2026", ["c1"], 95),
        makeField("summary", "Summary text here", ["c1"], 95),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto([makeChunk("c1", "Subject: Foo From: Bar To: Baz Date: 10/03/2026", 95)]),
        "user-123",
      );

      expect(response.decision).toBe("ACCEPT");
    });

    it("returns REVIEW when min effectiveConfidence is below 90", async () => {
      const { useCase, mockExtractionService } = await buildUseCase();

      // aiConfidence=90, sourceConfidence=70 → effective = 63 → REVIEW.
      const fields = [
        makeField("subject", "Foo", ["c1"], 90),
        makeField("from", "Bar", ["c1"], 90),
        makeField("to", "Baz", ["c1"], 90),
        makeField("dateReceived", "10/03/2026", ["c1"], 90),
        makeField("summary", "Summary text here", ["c1"], 90),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto([makeChunk("c1", "Subject: Foo From: Bar", 70)]),
        "user-123",
      );

      expect(response.decision).toBe("REVIEW");
    });

    it("returns INVALID when any field value is null (value === null in resolveDecision)", async () => {
      const { useCase, mockExtractionService } = await buildUseCase();

      // "from" has value=null → resolveDecision returns INVALID.
      const fields = [
        makeField("subject", "Foo", ["c1"], 95),
        makeField("from", null, [], null),
        makeField("to", "Baz", ["c1"], 95),
        makeField("dateReceived", "10/03/2026", ["c1"], 95),
        makeField("summary", "Summary text here", ["c1"], 95),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto([makeChunk("c1", "text", 95)]),
        "user-123",
      );

      expect(response.decision).toBe("INVALID");
    });

    it("returns INVALID when aiConfidence is null for a field with a value (anti-hallucination null)", async () => {
      const { useCase, mockExtractionService } = await buildUseCase();

      // "subject" has value="Foo" but aiConfidence=null → resolveDecision returns INVALID.
      const fields = [
        makeField("subject", "Foo", ["c1"], null),
        makeField("from", "Bar", ["c1"], 95),
        makeField("to", "Baz", ["c1"], 95),
        makeField("dateReceived", "10/03/2026", ["c1"], 95),
        makeField("summary", "Summary text here", ["c1"], 95),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto([makeChunk("c1", "text", 95)]),
        "user-123",
      );

      expect(response.decision).toBe("INVALID");
    });

    it("returns INVALID when effectiveConfidence is null (cited chunk missing from chunks)", async () => {
      const { useCase, mockExtractionService } = await buildUseCase();

      const fields = [
        makeField("subject", "Foo", ["c999"], 90), // chunk missing → effectiveConfidence null
        makeField("from", "Bar", ["c1"], 95),
        makeField("to", "Baz", ["c1"], 95),
        makeField("dateReceived", "10/03/2026", ["c1"], 95),
        makeField("summary", "Summary text here", ["c1"], 95),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto([makeChunk("c1", "text", 95)]),
        "user-123",
      );

      expect(response.decision).toBe("INVALID");
    });

    it("persists the same decision to the ExtractedDocumentQueueEntity", async () => {
      const { useCase, mockExtractionService, mockExtractedDocumentQueueService } = await buildUseCase();

      const fields = [
        makeField("subject", "Foo", ["c1"], 90),
        makeField("from", "Bar", ["c1"], 90),
        makeField("to", "Baz", ["c1"], 90),
        makeField("dateReceived", "10/03/2026", ["c1"], 90),
        makeField("summary", "Summary text here", ["c1"], 90),
      ];

      mockExtractionService.extract = jest.fn().mockResolvedValue({ fields });

      const response = await useCase.receiveDocument(
        makeMulterFile(),
        makeDto([makeChunk("c1", "Subject: Foo From: Bar", 70)]),
        "user-123",
      );

      // The decision persisted to the queue entity matches the response decision.
      const createArg = mockExtractedDocumentQueueService.create!.mock.calls[0][0];
      expect(createArg.decision).toBe(response.decision);
      expect(createArg.decision).toBe("REVIEW");
    });
  });

  /*
   * ── S3 cleanup on transaction failure ────────────────────────────────
   *
   * When any step inside the transaction throws:
   *   1. The catch block calls `s3Service.delete(objectKey)`.
   *   2. The original error is rethrown.
   *   3. If `s3Service.delete` itself throws, it is logged but swallowed —
   *      the ORIGINAL error still propagates.
   */
  describe("receiveDocument — S3 cleanup on transaction failure", () => {
    it("deletes the S3 object when the transaction throws, then rethrows the original error", async () => {
      const { useCase, mockS3Service } = await buildUseCase({
        transactionShouldFail: true,
      });

      await expect(
        useCase.receiveDocument(makeMulterFile(), makeDto(), "user-123"),
      ).rejects.toThrow("Transaction failed");

      // S3 upload still happened (before the transaction).
      expect(mockS3Service.upload).toHaveBeenCalledTimes(1);

      // S3 delete was called for cleanup with the same key that was uploaded.
      expect(mockS3Service.delete).toHaveBeenCalledTimes(1);
      expect(mockS3Service.delete).toHaveBeenCalledWith(
        mockS3Service.upload!.mock.calls[0][0],
      );
    });

    it("swallows S3 delete errors during cleanup (logs only) and still rethrows the original error", async () => {
      const { useCase, mockS3Service } = await buildUseCase({
        transactionShouldFail: true,
        s3DeleteShouldFail: true,
      });

      // The original transaction error propagates, NOT the S3 delete error.
      await expect(
        useCase.receiveDocument(makeMulterFile(), makeDto(), "user-123"),
      ).rejects.toThrow("Transaction failed");

      // S3 delete was still attempted.
      expect(mockS3Service.delete).toHaveBeenCalledTimes(1);
    });

    it("does NOT attempt cleanup when the transaction succeeds", async () => {
      const { useCase, mockS3Service } = await buildUseCase();

      await useCase.receiveDocument(makeMulterFile(), makeDto(), "user-123");

      expect(mockS3Service.delete).not.toHaveBeenCalled();
    });
  });
});
