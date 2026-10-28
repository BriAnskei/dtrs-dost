/**
 * Unit tests for `ExtractedQueueService` — the thin API-client wrapper for the
 * extracted-document queue endpoints.
 *
 * THE MODULE (service/extracted-queue.service.ts):
 *
 *   ExtractedQueueService.findAll(params)   → GET /extracted-document-queue
 *   ExtractedQueueService.findOneForReview(id) → GET /extracted-document-queue/:id/review
 *   ExtractedQueueService.getFile(id)       → GET /extracted-document-queue/:id/file (blob)
 *   ExtractedQueueService.invalidate(payload) → PATCH /extracted-document-queue/:id/invalidate
 *   ExtractedQueueService.createIncomingFromQueue(queueId, dto, key)
 *                                                → POST /incoming-documents/from-queue/:queueId
 *
 * Each method is a thin `apiClient.<verb>(url, ...)` call returning `response.data`.
 * The axios interceptor (auth/session refresh, network errors) is tested separately
 * in `lib/api-client.test.ts`. Here we verify only that:
 *
 *   1. The correct HTTP verb + endpoint is used.
 *   2. The request body / params are forwarded exactly.
 *   3. The response is unwrapped to `response.data`.
 *
 * `api-client` is mocked so no real HTTP occurs.
 */

import { describe, expect, it, vi } from "vitest";

const { mockGet, mockPost, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock("../../../../lib/api-client", () => ({
  apiClient: { get: mockGet, post: mockPost, patch: mockPatch },
}));

// Import after the mock is declared.
import { ExtractedQueueService } from "../service/extracted-queue.service";

describe("ExtractedQueueService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
  });

  describe("findAll", () => {
    it("GETs /extracted-document-queue with params forwarded as-is", async () => {
      const params = {
        uploader_name: "Jane",
        unknown_uploader: true,
        decision: "REVIEW" as const,
        sort: "newest" as const,
      };

      mockGet.mockResolvedValueOnce({ data: { data: [], nextCursor: null }, status: 200 });

      const result = await ExtractedQueueService.findAll(params);

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith("/extracted-document-queue", { params });
      expect(result).toEqual({ data: [], nextCursor: null });
    });

    it("sends undefined filters as undefined (no cleanup)", async () => {
      /*
       * Caller may pass `undefined` for optional filters. The service forwards
       * them verbatim; axios itself omits undefined query params.
       */
      mockGet.mockResolvedValueOnce({ data: { data: [], nextCursor: null }, status: 200 });

      await ExtractedQueueService.findAll({
        uploader_name: undefined,
        unknown_uploader: undefined,
        decision: undefined,
        sort: undefined,
      });

      expect(mockGet).toHaveBeenCalledWith("/extracted-document-queue", {
        params: {
          uploader_name: undefined,
          unknown_uploader: undefined,
          decision: undefined,
          sort: undefined,
        },
      });
    });
  });

  describe("findOneForReview", () => {
    it("GETs /extracted-document-queue/:id/review and returns response.data", async () => {
      const detail = {
        id: "q-1",
        file_name: "invoice.pdf",
        uploader_name: "Jane",
        decision: "REVIEW",
        status: "APPROVED",
        created_at: "2026-10-01T10:00:00Z",
        fields: [],
        chunk_locations: {},
      };

      mockGet.mockResolvedValueOnce({ data: detail, status: 200 });

      const result = await ExtractedQueueService.findOneForReview("q-1");

      expect(mockGet).toHaveBeenCalledWith("/extracted-document-queue/q-1/review");
      expect(result).toEqual(detail);
    });
  });

  describe("getFile", () => {
    it("GETs the file endpoint with responseType blob", async () => {
      const blob = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], {
        type: "application/pdf",
      });

      mockGet.mockResolvedValueOnce({ data: blob, status: 200 });

      const result = await ExtractedQueueService.getFile("q-1");

      expect(mockGet).toHaveBeenCalledWith("/extracted-document-queue/q-1/file", {
        responseType: "blob",
      });
      expect(result).toBe(blob);
    });
  });

  describe("invalidate", () => {
    it("PATCHes /:id/invalidate with { response } in the body", async () => {
      mockPatch.mockResolvedValueOnce({ status: 204 });

      await ExtractedQueueService.invalidate({
        id: "q-1",
        response: "Scan is unreadable. Please re-upload.",
      });

      expect(mockPatch).toHaveBeenCalledWith("/extracted-document-queue/q-1/invalidate", {
        response: "Scan is unreadable. Please re-upload.",
      });
    });

    it("sends undefined response when not provided", async () => {
      /*
       * The InvalidateExtractedQueuePayload allows response to be undefined
       * (no reason given). The service destructures `{ id, response }` and sends
       * `{ response }` — undefined serializes to nothing in JSON.
       */
      mockPatch.mockResolvedValueOnce({ status: 204 });

      await ExtractedQueueService.invalidate({ id: "q-1", response: undefined });

      expect(mockPatch).toHaveBeenCalledWith("/extracted-document-queue/q-1/invalidate", {
        response: undefined,
      });
    });

    it("resolves to void (no return value)", async () => {
      mockPatch.mockResolvedValueOnce({ status: 204 });

      const result = await ExtractedQueueService.invalidate({ id: "q-1" });

      expect(result).toBeUndefined();
    });
  });

  describe("createIncomingFromQueue", () => {
    it("POSTs to /incoming-documents/from-queue/:id with dto and Idempotency-Key header", async () => {
      const dto = {
        subject: "Invoice",
        document_from: "vendor@example.com",
        recipient: "buyer@example.com",
        date_received: "2026-10-15",
        summary: "Purchase order",
      };

      mockPost.mockResolvedValueOnce({
        data: { id: "inc-1", documentFileId: "df-1", code: "DOC-001" },
        status: 201,
      });

      const result = await ExtractedQueueService.createIncomingFromQueue(
        "q-1",
        dto,
        "key-123",
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/incoming-documents/from-queue/q-1",
        dto,
        { headers: { "Idempotency-Key": "key-123" } },
      );
      expect(result).toEqual({ id: "inc-1", documentFileId: "df-1", code: "DOC-001" });
    });

    it("propagates HTTP errors to the caller", async () => {
      mockPost.mockRejectedValueOnce(new Error("409 Conflict"));

      await expect(
        ExtractedQueueService.createIncomingFromQueue("q-1", {} as never, "key"),
      ).rejects.toThrow("409 Conflict");
    });
  });
});
