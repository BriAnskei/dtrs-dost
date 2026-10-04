/**
 * Unit tests for the frontend `extractionService` API client wrapper
 * (extraction-service.ts).
 *
 * THE MODULE UNDER TEST:
 *
 *   extractionService.extractFields(request): Promise<ExtractionResponse>
 *
 * It is a thin wrapper around `apiClient.post("/extraction", request)` that
 * returns `response.data`. The axios interceptor logic (session refresh,
 * network errors, 401/403 handling) is already thoroughly tested in
 * `lib/api-client.test.ts` — here we verify only that:
 *
 *   1. The request is POSTed to "/extraction" with the exact request body.
 *   2. The response is unwrapped to `response.data` and returned verbatim.
 *   3. HTTP errors propagate to the caller (the `useExtraction` hook is
 *      responsible for catching and translating them into failure descriptors).
 *
 * The `api-client` module is mocked so no real HTTP is performed.
 */

import { describe, expect, it, vi } from "vitest";

/*
 * Vitest hoists vi.mock() above all imports/consts, so any variable
 * referenced in the factory must be declared via vi.hoisted() to be
 * accessible at hoist time.
 */
const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock("../../../../lib/api-client", () => ({
  apiClient: {
    post: mockPost,
  },
}));

// Import after the mock is declared so the mock is in place.
import { extractionService } from "../service/extraction-service";
import type { ExtractionRequest, ExtractionResponse } from "../service/extraction-service";

describe("extractionService", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  describe("extractFields", () => {
    it("POSTs to /extraction with the request body", async () => {
      const request: ExtractionRequest = {
        documentType: "incoming",
        chunks: [{ chunkId: "p1-o1", text: "Subject: Foo" }],
      };

      mockPost.mockResolvedValueOnce({
        data: { fields: [] },
        status: 201,
      });

      await extractionService.extractFields(request);

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith("/extraction", request);
    });

    it("returns response.data verbatim (unwrapped)", async () => {
      const response: ExtractionResponse = {
        fields: [
          { field: "subject", value: "Foo", chunkIds: ["p1-o1"], aiConfidence: 90 },
          { field: "from", value: null, chunkIds: [], aiConfidence: null },
        ],
      };

      mockPost.mockResolvedValueOnce({ data: response, status: 201 });

      const request: ExtractionRequest = {
        documentType: "incoming",
        chunks: [{ chunkId: "p1-o1", text: "Subject: Foo" }],
      };

      const result = await extractionService.extractFields(request);

      // The wrapper should return just .data, not the full axios response.
      expect(result).toEqual(response);
    });

    it("propagates HTTP errors to the caller without swallowing them", async () => {
      const axiosError = Object.assign(new Error("Request failed with status 400"), {
        response: { status: 400, data: { message: "Bad request" } },
      });

      mockPost.mockRejectedValueOnce(axiosError);

      const request: ExtractionRequest = {
        documentType: "incoming",
        chunks: [{ chunkId: "p1-o1", text: "Subject: Foo" }],
      };

      await expect(extractionService.extractFields(request)).rejects.toThrow(
        "Request failed with status 400",
      );
    });

    it("sends outgoing documentType as-is", async () => {
      const request: ExtractionRequest = {
        documentType: "outgoing",
        chunks: [{ chunkId: "p1-o1", text: "To: Someone" }],
      };

      mockPost.mockResolvedValueOnce({ data: { fields: [] }, status: 201 });

      await extractionService.extractFields(request);

      const [, body] = mockPost.mock.calls[0];
      expect((body as ExtractionRequest).documentType).toBe("outgoing");
    });

    it("forwards the full chunks array (no client-side filtering)", async () => {
      const request: ExtractionRequest = {
        documentType: "incoming",
        chunks: [
          { chunkId: "p1-o1", text: "Line 1" },
          { chunkId: "p1-o2", text: "Line 2" },
          { chunkId: "p2-o1", text: "Line 3" },
        ],
      };

      mockPost.mockResolvedValueOnce({ data: { fields: [] }, status: 201 });

      await extractionService.extractFields(request);

      expect(mockPost.mock.calls[0][1]).toEqual(request);
    });
  });
});
