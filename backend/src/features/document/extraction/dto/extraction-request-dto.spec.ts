/**
 * Unit tests for `ExtractionRequestDto` validation — the request body
 * accepted by `ExtractionController.extract()`.
 *
 * THE DTO UNDER TEST (dto/extraction-request-dto.ts):
 *
 *   class ExtractionRequestDto {
 *     @IsIn([...DOCUMENT_DIRECTIONS])  documentType: "incoming" | "outgoing";
 *     @ArrayNotEmpty() @ArrayMaxSize(2000)  chunks: ExtractionChunkDto[];
 *   }
 *
 *   class ExtractionChunkDto {
 *     @IsString() @IsNotEmpty() @MaxLength(200)  chunkId: string;
 *     @IsString() @IsNotEmpty() @MaxLength(20_000)  text: string;
 *   }
 *
 * WHY THIS MATTERS:
 *   The controller is admin-gated and idempotent, but a malformed payload
 *   would otherwise reach `ExtractionService.extract()`, where defensive
 *   dedup happens but chunkId/text shape is *not* validated. These tests pin
 *   the class-validator contract so that bad input is rejected with a 400
 *   at the NestJS validation layer, not a runtime crash deeper in the stack.
 *
 * TESTING STRATEGY:
 *   Use `plainToInstance` from class-transformer + `validate` from
 *   class-validator to drive the same decorators the request body flows
 *   through under `ValidationPipe`. Each test passes a plain object,
 *   asserts `errors.length` and the specific constraint that failed.
 *
 * THE CONSTRAINTS PINNED:
 *   - documentType must be exactly "incoming" or "outgoing"
 *   - chunks must be a non-empty array with at most 2000 entries
 *   - each chunk must have chunkId (non-empty string ≤ 200 chars)
 *   - each chunk must have text (non-empty string ≤ 20 000 chars)
 */

import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ExtractionRequestDto } from "./extraction-request-dto";

/**
 * Validates a DTO using class-validator's `validate` with options that surface
 * nested validation errors (children), mirroring how NestJS's ValidationPipe
 * runs when `transform: true` and `whitelist: true` are active.
 *
 * `validationError: { target: false }` strips the class-instance reference
 * from each error node so the JSON is pure data (useful for assertions).
 * `whitelist: false` keeps all properties so nested errors retain their
 * class identity and produce the `children` arrays we inspect for per-chunk
 * errors.
 *
 * class-validator nests errors at two levels for `@ValidateNested({ each: true })`
 * arrays: `errors[0].children[0]` (the array index node) →
 * `errors[0].children[0].children[0]` (the actual chunkDto error), so the
 * property path to a constraint is `errors[0].children[0].children[0].constraints`.
 * class-validator only creates child entries for *invalid* chunks — valid
 * ones are skipped — so `children[0]` may correspond to chunk index `1` when
 * index `0` is valid.
 */
async function validateDto(plain: unknown) {
  const dto = plainToInstance(ExtractionRequestDto, plain, {
    excludeExtraneousValues: false,
  });
  return validate(dto, {
    whitelist: false,
    forbidNonWhitelisted: false,
    validationError: { target: false },
  });
}

describe("ExtractionRequestDto", () => {
  /* ── documentType validation ────────────────────────────────────────── */

  describe("documentType", () => {
    it("accepts 'incoming'", async () => {
      const errors = await validateDto({
        documentType: "incoming",
        chunks: [{ chunkId: "c1", text: "hello" }],
      });

      expect(errors).toHaveLength(0);
    });

    it("accepts 'outgoing'", async () => {
      const errors = await validateDto({
        documentType: "outgoing",
        chunks: [{ chunkId: "c1", text: "hello" }],
      });

      expect(errors).toHaveLength(0);
    });

    it("rejects an unknown documentType", async () => {
      const errors = await validateDto({
        documentType: "bogus",
        chunks: [{ chunkId: "c1", text: "hello" }],
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("documentType");
      expect(errors[0].constraints).toHaveProperty("isIn");
    });

    it("rejects a missing documentType", async () => {
      const errors = await validateDto({
        chunks: [{ chunkId: "c1", text: "hello" }],
      });

      const docTypeError = errors.find((e) => e.property === "documentType");
      expect(docTypeError).toBeDefined();
    });
  });

  /* ── chunks array validation ────────────────────────────────────────── */

  describe("chunks", () => {
    it("rejects when chunks is an empty array", async () => {
      const errors = await validateDto({
        documentType: "incoming",
        chunks: [],
      });

      // ArrayNotEmpty fires — the array must have at least one element.
      const chunkError = errors.find((e) => e.property === "chunks");
      expect(chunkError?.constraints).toHaveProperty("arrayNotEmpty");
    });

    it("rejects when chunks exceeds the 2000 element cap", async () => {
      const tooMany = Array.from({ length: 2001 }, (_, i) => ({
        chunkId: `c${i}`,
        text: "x",
      }));

      const errors = await validateDto({
        documentType: "incoming",
        chunks: tooMany,
      });

      const chunkError = errors.find((e) => e.property === "chunks");
      expect(chunkError?.constraints).toHaveProperty("arrayMaxSize");
    });

    it("rejects when chunks is missing (undefined)", async () => {
      const errors = await validateDto({
        documentType: "incoming",
      });

      const chunkError = errors.find((e) => e.property === "chunks");
      expect(chunkError).toBeDefined();
    });

    it("rejects when chunks is not an array", async () => {
      const errors = await validateDto({
        documentType: "incoming",
        chunks: "not-an-array",
      });

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  /* ── chunkId validation per element ────────────────────────────────── */

  describe("chunk.chunkId", () => {
    it("rejects a chunkId that is an empty string", async () => {
      const errors = await validateDto({
        documentType: "incoming",
        chunks: [{ chunkId: "", text: "hello" }],
      });

      expect(errors[0].children?.[0].children?.[0].constraints).toHaveProperty(
        "isNotEmpty",
      );
    });

    it("rejects a chunkId longer than 200 characters", async () => {
      const longId = "x".repeat(201);

      const errors = await validateDto({
        documentType: "incoming",
        chunks: [{ chunkId: longId, text: "hello" }],
      });

      expect(errors[0].children?.[0].children?.[0].constraints).toHaveProperty(
        "maxLength",
      );
    });

    it("rejects a chunkId that is not a string (number)", async () => {
      const errors = await validateDto({
        documentType: "incoming",
        chunks: [{ chunkId: 123, text: "hello" }],
      });

      expect(errors[0].children?.[0].children?.[0].constraints).toHaveProperty(
        "isString",
      );
    });

    it("accepts a chunkId of exactly 200 characters (boundary)", async () => {
      const boundaryId = "x".repeat(200);

      const errors = await validateDto({
        documentType: "incoming",
        chunks: [{ chunkId: boundaryId, text: "hello" }],
      });

      expect(errors).toHaveLength(0);
    });
  });

  /* ── chunk.text validation per element ─────────────────────────────── */

  describe("chunk.text", () => {
    it("rejects text that is an empty string", async () => {
      const errors = await validateDto({
        documentType: "incoming",
        chunks: [{ chunkId: "c1", text: "" }],
      });

      expect(errors[0].children?.[0].children?.[0].constraints).toHaveProperty(
        "isNotEmpty",
      );
    });

    it("rejects text longer than 20 000 characters", async () => {
      const longText = "x".repeat(20_001);

      const errors = await validateDto({
        documentType: "incoming",
        chunks: [{ chunkId: "c1", text: longText }],
      });

      expect(errors[0].children?.[0].children?.[0].constraints).toHaveProperty(
        "maxLength",
      );
    });

    it("rejects text that is not a string (null)", async () => {
      const errors = await validateDto({
        documentType: "incoming",
        chunks: [{ chunkId: "c1", text: null }],
      });

      expect(errors[0].children?.[0].children?.[0].constraints).toHaveProperty(
        "isString",
      );
    });

    it("accepts text of exactly 20 000 characters (boundary)", async () => {
      const boundaryText = "x".repeat(20_000);

      const errors = await validateDto({
        documentType: "incoming",
        chunks: [{ chunkId: "c1", text: boundaryText }],
      });

      expect(errors).toHaveLength(0);
    });
  });

  /* ── multi-chunk scenarios ──────────────────────────────────────────── */

  describe("multiple chunks", () => {
    it("accepts a payload with many valid chunks", async () => {
      const errors = await validateDto({
        documentType: "outgoing",
        chunks: Array.from({ length: 50 }, (_, i) => ({
          chunkId: `p${i}-o1`,
          text: `line ${i}`,
        })),
      });

      expect(errors).toHaveLength(0);
    });

    it("rejects when the second chunk has an invalid chunkId", async () => {
      /*
       * class-validator only creates child error nodes for *invalid* chunks
       * — valid chunks are skipped. So with chunk[0] valid and chunk[1] invalid,
       * errors[0].children[0] has property "1" (the index of the bad chunk).
       */
      const errors = await validateDto({
        documentType: "incoming",
        chunks: [
          { chunkId: "valid", text: "ok" },
          { chunkId: "", text: "bad" },
        ],
      });

      const secondChunkError = errors[0]?.children?.[0]?.children?.[0];
      expect(secondChunkError?.constraints).toHaveProperty("isNotEmpty");
    });

    it("rejects when the second chunk has invalid text", async () => {
      const errors = await validateDto({
        documentType: "incoming",
        chunks: [
          { chunkId: "valid", text: "ok" },
          { chunkId: "also-valid", text: "" },
        ],
      });

      const secondChunkError = errors[0]?.children?.[0]?.children?.[0];
      expect(secondChunkError?.constraints).toHaveProperty("isNotEmpty");
    });
  });
});
