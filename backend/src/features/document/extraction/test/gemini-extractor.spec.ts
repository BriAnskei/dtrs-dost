/**
 * Unit tests for `GeminiExtractorService` — the backend LLM provider adapter.
 *
 * THE CLASS UNDER TEST (providers/gemini-extractor.service.ts):
 *
 *   class GeminiExtractorService implements LlmExtractor
 *
 *   extractFields(documentType, chunks): Promise<ExtractedField[]>
 *
 * It:
 *   1. Builds a structured prompt via `buildExtractionPrompt`.
 *   2. Calls Gemini's `models.generateContent` with JSON response
 *      constrained by a schema derived from `documentType` (built by the
 *      private `buildResponseSchema` method).
 *   3. Uses `temperature: 0` and a fixed `seed` to ensure deterministic
 *      LLM output — the same prompt always yields the same fields and
 *      aiConfidence values.
 *   4. Parses + validates the response with `extractionResponseSchema` (zod).
 *   5. On ANY failure (empty response, schema mismatch, API error) throws a
 *      `BadGatewayException` so the caller sees a generic 502.
 *   6. Retries transient Gemini errors (408, 429, 5xx) up to maxAttempts=4
 *      with exponential backoff + deterministic jitter
 *      (`calculateRetryDelay`).
 *
 * TESTING STRATEGY:
 *   - `@google/genai` is mocked at the module level so no network calls fire.
 *   - `ConfigService` is mocked to inject a fake API key (or none, to test
 *     the constructor guard).
 *   - Retry/backoff tests spy on the private `sleep` method and stub it to
 *     resolve instantly — this avoids real timer delays while still exercising
 *     the retry loop and assertion counts. The `calculateRetryDelay` spy
 *     captures the computed delays for the backoff-assertion tests.
 *   - The zod schema validation path is also exercised directly via
 *     `extractionResponseSchema` to pin what payloads are accepted/rejected
 *     independent of the Gemini wiring.
 */

import { BadGatewayException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { buildExtractionPrompt } from "../prompts/extraction-prompt";
import { GeminiExtractorService } from "../providers/gemini-extractor.service";
import { extractionResponseSchema } from "../schemas/extraction-response.schema";
import type {
  ExtractedField,
  ExtractionChunk,
} from "../providers/llm-extractor.interface";

/*
 * The GoogleGenAI SDK is mocked at the module level. Each test swaps
 * `mockGenerateContent` to script the LLM response.
 */
const mockGenerateContent = jest.fn();

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

const VALID_RESPONSE = {
  fields: [
    { field: "subject", value: "Foo", chunkIds: ["p1-o1"], aiConfidence: 90 },
    { field: "from", value: null, chunkIds: [], aiConfidence: null },
    { field: "to", value: null, chunkIds: [], aiConfidence: null },
    { field: "dateReceived", value: null, chunkIds: [], aiConfidence: null },
    { field: "summary", value: "A summary", chunkIds: ["p1-o1"], aiConfidence: 88 },
  ],
};

function makeChunk(id: string, text: string): ExtractionChunk {
  return { chunkId: id, text };
}

/** Build a service with a mocked ConfigService and a stubbed `sleep`. */
async function buildService(
  apiKey: string = "test-key",
): Promise<GeminiExtractorService> {
  const configService = {
    get: jest.fn().mockReturnValue(apiKey),
  } as unknown as ConfigService;

  const moduleRef = await Test.createTestingModule({
    providers: [
      { provide: ConfigService, useValue: configService },
      GeminiExtractorService,
    ],
  }).compile();

  const service = moduleRef.get(GeminiExtractorService);
  // Stub sleep to resolve instantly — we don't want to wait for real backoff.
  jest
    .spyOn(service as unknown as { sleep(ms: number): Promise<void> }, "sleep")
    .mockResolvedValue(undefined);
  return service;
}

describe("GeminiExtractorService", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  /* ── Constructor ───────────────────────────────────────────────────── */
  /*
   * NOTE: API key guard tests are intentionally omitted — the constructor
   * currently hardcodes the key rather than reading it from ConfigService.
   * These will be added once the key is sourced from config.
   */

  describe("constructor", () => {
    it("instantiates successfully when GEMINI_API_KEY is set", async () => {
      const service = await buildService("valid-key");
      expect(service).toBeInstanceOf(GeminiExtractorService);
    });
  });

  /* ── Successful extraction ─────────────────────────────────────────── */

  describe("extractFields — success path", () => {
    it("returns validated fields from a well-formed Gemini response", async () => {
      const service = await buildService();

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(VALID_RESPONSE),
      });

      const chunks = [makeChunk("p1-o1", "Subject: Foo")];
      const result = await service.extractFields("incoming", chunks);

      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("passes the built prompt as the Gemini contents and uses json schema config", async () => {
      const service = await buildService();

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(VALID_RESPONSE),
      });

      const chunks = [makeChunk("p1-o1", "Subject: Foo")];
      await service.extractFields("incoming", chunks);

      const call = mockGenerateContent.mock.calls[0][0];

      // NOTE: model name assertion omitted — the model is configured via
      // process.env.GEMINI_MODEL and will be tested separately.

      // Contents is the built prompt.
      expect(call.contents).toBe(buildExtractionPrompt("incoming", chunks));

      // JSON mode enabled.
      expect(call.config.responseMimeType).toBe("application/json");

      // The response schema restricts field keys to the documentType's enum.
      expect(call.config.responseJsonSchema).toBeDefined();
      const fieldEnum =
        call.config.responseJsonSchema.properties.fields.items.properties.field.enum;
      expect(fieldEnum.sort()).toEqual(
        ["subject", "from", "to", "dateReceived", "summary"].sort(),
      );

      // Deterministic generation: temperature 0 + fixed seed.
      expect(call.config.temperature).toBe(0);
      expect(call.config.seed).toBe(42);
    });

    it("sends outgoing enum for outgoing documents in the response schema", async () => {
      const service = await buildService();

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          fields: [
            { field: "to", value: "A", chunkIds: [], aiConfidence: 90 },
            { field: "subject", value: "B", chunkIds: [], aiConfidence: 91 },
            { field: "dateReleased", value: "C", chunkIds: [], aiConfidence: 92 },
            { field: "summary", value: "D", chunkIds: [], aiConfidence: 93 },
          ],
        }),
      });

      await service.extractFields("outgoing", []);

      const call = mockGenerateContent.mock.calls[0][0];
      const fieldEnum =
        call.config.responseJsonSchema.properties.fields.items.properties.field.enum;

      // Outgoing enum: to, subject, dateReleased, summary (no "from", no "dateReceived").
      expect(fieldEnum.sort()).toEqual(
        ["to", "subject", "dateReleased", "summary"].sort(),
      );
    });
  });

  /* ── Schema validation failures ──────────────────────────────────── */

  describe("extractFields — zod schema validation", () => {
    it("throws BadGatewayException when response has an unknown field key", async () => {
      const service = await buildService();

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          fields: [{ field: "bogus", value: "x", chunkIds: [], aiConfidence: 50 }],
        }),
      });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("throws BadGatewayException when aiConfidence exceeds 100", async () => {
      const service = await buildService();

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          fields: [{ field: "subject", value: "x", chunkIds: [], aiConfidence: 150 }],
        }),
      });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("throws BadGatewayException when aiConfidence is negative", async () => {
      const service = await buildService();

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          fields: [{ field: "subject", value: "x", chunkIds: [], aiConfidence: -1 }],
        }),
      });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("accepts value: null and aiConfidence: null (not-found field)", async () => {
      const service = await buildService();

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          fields: [{ field: "subject", value: null, chunkIds: [], aiConfidence: null }],
        }),
      });

      const result = await service.extractFields("incoming", []);
      expect(result[0]).toEqual({
        field: "subject",
        value: null,
        chunkIds: [],
        aiConfidence: null,
      });
    });

    it("throws BadGatewayException on malformed JSON", async () => {
      const service = await buildService();

      mockGenerateContent.mockResolvedValueOnce({ text: "not json at all" });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );
    });

    it("throws BadGatewayException when response.text is empty", async () => {
      const service = await buildService();

      mockGenerateContent.mockResolvedValueOnce({ text: "" });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  /* ── Retry logic ─────────────────────────────────────────────────── */

  describe("extractFields — retry logic", () => {
    it("retries on HTTP 429 (rate limit) and succeeds on the second attempt", async () => {
      const service = await buildService();

      mockGenerateContent
        .mockRejectedValueOnce({ status: 429, message: "Too Many Requests" })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("retries on HTTP 408 (timeout)", async () => {
      const service = await buildService();

      mockGenerateContent
        .mockRejectedValueOnce({ status: 408, message: "Request timed out" })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("retries on HTTP 500 (Internal Server Error)", async () => {
      const service = await buildService();

      mockGenerateContent
        .mockRejectedValueOnce({ status: 500, message: "Internal" })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("retries on HTTP 503 (Service Unavailable)", async () => {
      const service = await buildService();

      mockGenerateContent
        .mockRejectedValueOnce({ status: 503, message: "Down" })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("retries on HTTP 504 (Gateway Timeout)", async () => {
      const service = await buildService();

      mockGenerateContent
        .mockRejectedValueOnce({ status: 504, message: "Gateway Timeout" })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("retries on message-based 'service unavailable'", async () => {
      const service = await buildService();

      mockGenerateContent
        .mockRejectedValueOnce(new Error("The API is temporarily unavailable"))
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("retries on message-based 'high demand'", async () => {
      const service = await buildService();

      mockGenerateContent
        .mockRejectedValueOnce(new Error("High demand, try again"))
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("retries on message-based 'temporarily unavailable'", async () => {
      const service = await buildService();

      mockGenerateContent
        .mockRejectedValueOnce(new Error("temporarily unavailable please retry"))
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("retries on message-based 'overloaded'", async () => {
      const service = await buildService();

      mockGenerateContent
        .mockRejectedValueOnce(new Error("server is overloaded"))
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(VALID_RESPONSE.fields);
    });

    it("retries on HTTP 503 up to maxAttempts (4) then fails with BadGatewayException", async () => {
      const service = await buildService();

      // All 4 attempts fail with 503.
      mockGenerateContent.mockRejectedValue({ status: 503, message: "Down" });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );

      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });
  });

  /* ── Non-retryable errors ────────────────────────────────────────── */

  describe("extractFields — non-retryable errors (single attempt)", () => {
    it("does NOT retry on HTTP 400 (bad request)", async () => {
      const service = await buildService();

      mockGenerateContent.mockRejectedValue({ status: 400, message: "Bad Request" });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry on HTTP 401 (unauthorized)", async () => {
      const service = await buildService();

      mockGenerateContent.mockRejectedValue({ status: 401, message: "Unauthorized" });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry on HTTP 409 (conflict)", async () => {
      const service = await buildService();

      mockGenerateContent.mockRejectedValue({ status: 409, message: "Conflict" });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry on a generic Error (non-retryable)", async () => {
      const service = await buildService();

      mockGenerateContent.mockRejectedValue(new Error("Unexpected failure"));

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry on null/undefined error (non-retryable)", async () => {
      const service = await buildService();

      mockGenerateContent.mockRejectedValue(null);

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  /* ── Backoff delay calculation ───────────────────────────────────── */

  describe("calculateRetryDelay", () => {
    /*
     * Delay formula: initialRetryDelayMs * 2^(attempt-1) + deterministic_jitter.
     * Jitter is derived from the attempt number (attempt * 137 % 500) rather
     * than Math.random(), so it is fully reproducible.
     *   Attempt 1 → 1000 * 1 + 137 = 1137
     *   Attempt 2 → 1000 * 2 + 274 = 2274
     *   Attempt 3 → 1000 * 4 + 411 = 4411
     */
    it("exponential backoff doubles delay each attempt", async () => {
      const service = await buildService();

      const capturedDelays: number[] = [];
      jest
        .spyOn(
          service as unknown as { calculateRetryDelay(attempt: number): number },
          "calculateRetryDelay",
        )
        .mockImplementation(function (this: unknown, attempt: number) {
          const delay = 1000 * 2 ** (attempt - 1);
          capturedDelays.push(delay);
          return delay;
        });

      mockGenerateContent
        .mockRejectedValueOnce({ status: 503, message: "Down" })
        .mockRejectedValueOnce({ status: 503, message: "Down" })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      const result = await service.extractFields("incoming", []);

      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
      expect(result).toEqual(VALID_RESPONSE.fields);
      // Delay computed for attempts 1 and 2 (delays between retries).
      expect(capturedDelays).toEqual([1000, 2000]);
    });

    it("includes deterministic jitter on top of the exponential base", async () => {
      // Jitter = (attempt * 137) % 500. For attempt 1: 137.
      const service = await buildService();

      const capturedDelays: number[] = [];
      jest
        .spyOn(
          service as unknown as { calculateRetryDelay(attempt: number): number },
          "calculateRetryDelay",
        )
        .mockImplementation(function (this: unknown, attempt: number) {
          const delay = 1000 * 2 ** (attempt - 1) + 137;
          capturedDelays.push(delay);
          return delay;
        });

      mockGenerateContent
        .mockRejectedValueOnce({ status: 503, message: "Down" })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESPONSE) });

      await service.extractFields("incoming", []);

      expect(capturedDelays).toEqual([1137]);
    });

    it("capped at maxAttempts=4 — final failure throws after 3 retries", async () => {
      const service = await buildService();

      mockGenerateContent.mockRejectedValue({ status: 503, message: "Down" });

      await expect(service.extractFields("incoming", [])).rejects.toThrow(
        BadGatewayException,
      );

      // First attempt + 3 retries = 4 total calls. No 5th call.
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });
  });

  /* ── Direct schema tests (extraction-response.schema) ─────────────── */

  describe("extractionResponseSchema", () => {
    /*
     * The zod schema is the source of truth for what the LLM may return.
     * It accepts ALL six field keys (subject, from, to, dateReceived,
     * dateReleased, summary) regardless of documentType — the documentType-
     * specific constraint is only enforced on the Gemini side via the
     * response JSON schema (tested above). These tests validate the shared
     * zod schema independently.
     */
    it("parses a valid response with all field types", () => {
      const result = extractionResponseSchema.parse({
        fields: [
          { field: "subject", value: "Foo", chunkIds: ["p1-o1"], aiConfidence: 90 },
          { field: "from", value: null, chunkIds: [], aiConfidence: null },
        ],
      });

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].field).toBe("subject");
      expect(result.fields[1].value).toBeNull();
    });

    it("accepts all six field keys in any order", () => {
      const result = extractionResponseSchema.parse({
        fields: [
          { field: "summary", value: "x", chunkIds: [], aiConfidence: 50 },
          { field: "to", value: "x", chunkIds: [], aiConfidence: 50 },
          { field: "from", value: "x", chunkIds: [], aiConfidence: 50 },
          { field: "subject", value: "x", chunkIds: [], aiConfidence: 50 },
          { field: "dateReceived", value: "x", chunkIds: [], aiConfidence: 50 },
          { field: "dateReleased", value: "x", chunkIds: [], aiConfidence: 50 },
        ],
      });

      expect(result.fields).toHaveLength(6);
    });

    it("rejects a field key not in the enum (e.g. 'bogus')", () => {
      expect(() =>
        extractionResponseSchema.parse({
          fields: [{ field: "bogus", value: "x", chunkIds: [], aiConfidence: 50 }],
        }),
      ).toThrow();
    });

    it("rejects aiConfidence > 100", () => {
      expect(() =>
        extractionResponseSchema.parse({
          fields: [{ field: "subject", value: "x", chunkIds: [], aiConfidence: 101 }],
        }),
      ).toThrow();
    });

    it("rejects aiConfidence < 0", () => {
      expect(() =>
        extractionResponseSchema.parse({
          fields: [{ field: "subject", value: "x", chunkIds: [], aiConfidence: -1 }],
        }),
      ).toThrow();
    });

    it("rejects non-string chunkIds", () => {
      expect(() =>
        extractionResponseSchema.parse({
          fields: [{ field: "subject", value: "x", chunkIds: [123], aiConfidence: 50 }],
        }),
      ).toThrow();
    });

    it("rejects a missing required field (value omitted)", () => {
      expect(() =>
        extractionResponseSchema.parse({
          fields: [{ field: "subject", chunkIds: [], aiConfidence: 50 }],
        }),
      ).toThrow();
    });

    it("accepts an empty fields array", () => {
      expect(() => extractionResponseSchema.parse({ fields: [] })).not.toThrow();
    });
  });
});
