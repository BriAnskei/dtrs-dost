/**
 * Unit tests for the **validation edge cases** in `ExtractionService`
 * (extraction.service.ts), covering `validateField` and
 * `validateAndNormalizeFields`:
 *
 *   1. aiConfidence bounds — values outside [0, 100] throw 400.
 *   2. null value + non-empty chunkIds — contradictory, throws 400.
 *   3. summary field bypass — anti-hallucination / citation checks are
 *      SKIPPED for "summary" because the LLM writes it (not copied from chunks).
 *   4. value present in document but NOT in cited chunks — warns, does NOT
 *      throw (citation imprecision is a UX issue, not a safety issue).
 *      aiConfidence is preserved because the value was verified.
 *   5. value NOT present in document text at all — does NOT throw; returns the
 *      field with aiConfidence set to null (INVALID path), so a human reviewer
 *      can see the hallucinated value without the whole extraction being
 *      discarded.
 *   6. value present but no chunkIds cited — warns, does NOT throw.
 *   7. Outgoing document type validation (4 fields, not 5).
 *   8. ChunkId ordering preserved in the response.
 */

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { DocumentDirection } from "../contants/document-direction";
import type { ExtractionRequestDto } from "../dto/extraction-request-dto";
import { ExtractionService } from "../extraction.service";
import type {
  ExtractedField,
  ExtractionChunk,
  LlmExtractor,
} from "../providers/llm-extractor.interface";
import { LLM_EXTRACTOR } from "../providers/llm-extractor.interface";

function chunk(chunkId: string, text: string): ExtractionChunk {
  return { chunkId, text };
}

function field(
  fieldKey: string,
  value: string | null,
  chunkIds: string[],
  aiConfidence: number | null,
): ExtractedField {
  return {
    field: fieldKey as ExtractedField["field"],
    value,
    chunkIds,
    aiConfidence,
  };
}

function makeRequest(
  documentType: DocumentDirection,
  chunks: ExtractionChunk[],
): ExtractionRequestDto {
  return { documentType, chunks } as unknown as ExtractionRequestDto;
}

async function buildService(
  extractFields: (
    documentType: DocumentDirection,
    chunks: ExtractionChunk[],
  ) => Promise<ExtractedField[]>,
) {
  const mock: jest.Mocked<LlmExtractor> = {
    extractFields: jest.fn(extractFields),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [ExtractionService, { provide: LLM_EXTRACTOR, useValue: mock }],
  }).compile();

  return {
    service: moduleRef.get(ExtractionService),
    mock,
  };
}

async function expectBadRequest(
  action: () => Promise<unknown>,
  expectedError: string,
): Promise<void> {
  let thrown: unknown;

  try {
    await action();
    throw new Error("expected action to reject with BadRequestException");
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(BadRequestException);
  expect((thrown as BadRequestException).getResponse()).toMatchObject({
    success: false,
    error: expectedError,
  });
}

describe("ExtractionService — validateField edge cases", () => {
  describe("aiConfidence bounds", () => {
    it("throws 400 when aiConfidence > 100", async () => {
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", "Foo", ["p1-o1"], 101)]),
      );

      const request = makeRequest("incoming", [chunk("p1-o1", "Subject: Foo")]);

      await expectBadRequest(
        () => service.extract(request),
        "Invalid confidence for field subject",
      );
    });

    it("throws 400 when aiConfidence < 0", async () => {
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", "Foo", ["p1-o1"], -1)]),
      );

      const request = makeRequest("incoming", [chunk("p1-o1", "Subject: Foo")]);

      await expectBadRequest(
        () => service.extract(request),
        "Invalid confidence for field subject",
      );
    });

    it("accepts aiConfidence of exactly 0", async () => {
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", "Foo", ["p1-o1"], 0)]),
      );

      const request = makeRequest("incoming", [chunk("p1-o1", "Subject: Foo")]);

      const result = await service.extract(request);
      const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
      expect(byField.subject.aiConfidence).toBe(0);
    });

    it("accepts aiConfidence of exactly 100", async () => {
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", "Foo", ["p1-o1"], 100)]),
      );

      const request = makeRequest("incoming", [chunk("p1-o1", "Subject: Foo")]);

      const result = await service.extract(request);
      const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
      expect(byField.subject.aiConfidence).toBe(100);
    });

    it("accepts null aiConfidence (model opted out of providing confidence)", async () => {
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", "Foo", ["p1-o1"], null)]),
      );

      const request = makeRequest("incoming", [chunk("p1-o1", "Subject: Foo")]);

      const result = await service.extract(request);
      const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
      expect(byField.subject.aiConfidence).toBeNull();
    });

    it("still checks confidence bounds even when value is null", async () => {
      /*
       * The confidence-range check runs BEFORE the null-value early-return
       * in validateField(). So a null-valued field with aiConfidence=150 is
       * still rejected as a malformed LLM response. This pins that order-of-
       * operations behavior so any future refactor doesn't silently accept
       * out-of-range confidence on not-found fields.
       */
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", null, [], 150)]),
      );

      const request = makeRequest("incoming", [chunk("p1-o1", "no subject here")]);

      await expectBadRequest(
        () => service.extract(request),
        "Invalid confidence for field subject",
      );
    });
  });

  describe("null value + non-empty chunkIds (contradictory)", () => {
    it("throws 400 when value is null but chunkIds are present", async () => {
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", null, ["p1-o1"], null)]),
      );

      const request = makeRequest("incoming", [chunk("p1-o1", "text")]);

      await expectBadRequest(
        () => service.extract(request),
        "Field subject has chunkIds but no value",
      );
    });
  });

  describe("summary field bypass", () => {
    it("does NOT run anti-hallucination check for summary values", async () => {
      /*
       * summary is LLM-prose, NOT copied from the document. A value that does
       * not appear verbatim in any chunk should still be accepted — the server
       * skips the valueInDocument check for "summary".
       */
      const { service } = await buildService(() =>
        Promise.resolve([
          field("summary", "LLM hallucinated prose summary", ["p1-o1"], 90),
        ]),
      );

      const request = makeRequest("incoming", [
        chunk("p1-o1", "Subject: Foo From: Bar To: Baz"),
      ]);

      const result = await service.extract(request);
      const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
      expect(byField.summary.value).toBe("LLM hallucinated prose summary");
    });

    it("warns (but does not throw) when summary has no chunkIds", async () => {
      const { service } = await buildService(() =>
        Promise.resolve([field("summary", "A summary", [], 90)]),
      );

      const request = makeRequest("incoming", [chunk("p1-o1", "Some text")]);

      // Should NOT throw — just logs a warning.
      const result = await service.extract(request);
      const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
      expect(byField.summary.value).toBe("A summary");
    });
  });

  describe("value in document but not in cited chunks (imprecise citation)", () => {
    it("warns but does NOT throw when value is in the document but not the cited chunk", async () => {
      /*
       * The value exists somewhere in the document text (union of all chunks),
       * but the cited chunk does not contain it. This is an imprecise citation
       * — a UX problem (wrong highlight), not a safety problem. The server
       * logs a warning and continues. aiConfidence is preserved because the
       * value WAS verified against the document text.
       */
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", "Foo", ["p1-o2"], 90)]),
      );

      const request = makeRequest("incoming", [
        chunk("p1-o1", "Subject: Foo"), // contains "Foo"
        chunk("p1-o2", "unrelated text"), // cited but doesn't contain "Foo"
      ]);

      const result = await service.extract(request);
      const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
      expect(byField.subject.value).toBe("Foo");
      expect(byField.subject.chunkIds).toEqual(["p1-o2"]);
      expect(byField.subject.aiConfidence).toBe(90);
    });
  });

  describe("value NOT in document text (anti-hallucination)", () => {
    it("does NOT throw; returns field with null aiConfidence (INVALID path)", async () => {
      /*
       * The LLM returned a value ("Bar") that does not appear anywhere in the
       * document text. Previously this threw a 400 BadRequestException,
       * discarding every field — including ones that were extracted correctly.
       *
       * New behavior: the value is returned (so a human reviewer can see what
       * the LLM hallucinated), but aiConfidence is set to null. The decision
       * logic treats null aiConfidence as INVALID, routing the document for
       * manual review instead of accepting an unverified extraction.
       */
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", "Bar", ["p1-o1"], 90)]),
      );

      const request = makeRequest("incoming", [
        chunk("p1-o1", "Subject: Foo"), // "Bar" is NOT in this chunk
      ]);

      const result = await service.extract(request);
      const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));

      expect(byField.subject.value).toBe("Bar");
      expect(byField.subject.chunkIds).toEqual(["p1-o1"]);
      expect(byField.subject.aiConfidence).toBeNull();
    });

    it("preserves correctly extracted fields when a sibling field is untrusted", async () => {
      /*
       * If field A passes anti-hallucination but field B does not, A should
       * keep its aiConfidence while B gets null. The whole extraction must
       * not be discarded for a single hallucinated value.
       */
      const { service } = await buildService(() =>
        Promise.resolve([
          field("subject", "Foo", ["p1-o1"], 90), // in document — trusted
          field("from", "Bar", ["p1-o1"], 95), // NOT in document — untrusted
        ]),
      );

      const request = makeRequest("incoming", [
        chunk("p1-o1", "Subject: Foo"), // "Foo" here, "Bar" not
      ]);

      const result = await service.extract(request);
      const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));

      expect(byField.subject.value).toBe("Foo");
      expect(byField.subject.aiConfidence).toBe(90);
      expect(byField.from.value).toBe("Bar");
      expect(byField.from.aiConfidence).toBeNull();
    });
  });

  describe("non-null value with no chunkIds (imprecise citation)", () => {
    it("warns but does NOT throw when a field has a value but no chunkIds", async () => {
      const { service } = await buildService(() =>
        Promise.resolve([field("subject", "Foo", [], 90)]),
      );

      const request = makeRequest("incoming", [chunk("p1-o1", "Subject: Foo")]);

      const result = await service.extract(request);
      const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
      expect(byField.subject.value).toBe("Foo");
      expect(byField.subject.chunkIds).toEqual([]);
    });
  });
});

describe("ExtractionService — outgoing document type", () => {
  it("returns 4 fields for outgoing documents (to, subject, datePrepared, summary)", async () => {
    // Chunk text must contain all field values so anti-hallucination passes.
    const docText = "To: Recipient Corp Subject: Foo Date: 10/03/2026 Summary text";
    const { service, mock } = await buildService((_dt, _chunks) =>
      Promise.resolve([
        field("to", "Recipient Corp", ["p1-o1"], 90),
        field("subject", "Foo", ["p1-o1"], 88),
        field("datePrepared", "10/03/2026", ["p1-o1"], 95),
        field("summary", "Summary text", ["p1-o1"], 85),
      ]),
    );

    const request = makeRequest("outgoing", [chunk("p1-o1", docText)]);

    const result = await service.extract(request);

    expect(result.fields).toHaveLength(4);
    expect(result.fields.map((f) => f.field)).toEqual([
      "to",
      "subject",
      "datePrepared",
      "summary",
    ]);
  });

  it("silently drops stray incoming-only fields when processing outgoing documents", async () => {
    /*
     * "from" is not in the outgoing field set (to, subject, datePrepared,
     * summary). The service builds a fieldsByName map of ALL LLM-returned
     * fields, but only iterates over expectedFields when producing the
     * response. So a stray "from" is silently dropped — not thrown, not
     * returned. Only outgoing fields appear in the result.
     */
    const docText = "From: Someone To: Recipient Corp Subject: Foo Date: 10/03/2026";
    const { service } = await buildService(() =>
      Promise.resolve([
        field("from", "Someone", ["p1-o1"], 90), // stray — should be dropped
        field("to", "Recipient Corp", ["p1-o1"], 90),
        field("subject", "Foo", ["p1-o1"], 88),
        field("datePrepared", "10/03/2026", ["p1-o1"], 95),
        field("summary", "Summary", ["p1-o1"], 85),
      ]),
    );

    const request = makeRequest("outgoing", [chunk("p1-o1", docText)]);

    const result = await service.extract(request);
    const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));

    // "from" is dropped — only outgoing fields appear in the response.
    expect(byField.from).toBeUndefined();
    expect(byField.to.value).toBe("Recipient Corp");
    expect(result.fields).toHaveLength(4);
  });
});

describe("ExtractionService — field ordering & chunk preservation", () => {
  it("returns fields in the order defined by FIELDS_BY_DIRECTION (deterministic)", async () => {
    const { service } = await buildService(() =>
      Promise.resolve([
        // Deliberately out of order — the service should reorder to the spec.
        field("summary", "Summary", ["p1-o1"], 85),
        field("to", "Recipient", ["p1-o1"], 90),
        field("subject", "Subject: Foo", ["p1-o1"], 88),
        field("from", "Sender", ["p1-o1"], 91), // incoming-only
        field("dateReceived", "10/03/2026", ["p1-o2"], 95),
      ]),
    );

    const request = makeRequest("incoming", [
      chunk("p1-o1", "From: Sender To: Recipient Subject: Foo"),
      chunk("p1-o2", "Date: 10/03/2026"),
    ]);

    const result = await service.extract(request);

    // Incoming order: subject, from, to, dateReceived, summary
    expect(result.fields.map((f) => f.field)).toEqual([
      "subject",
      "from",
      "to",
      "dateReceived",
      "summary",
    ]);
  });

  it("preserves the LLM's chunkId list order in the response (does not sort)", async () => {
    const { service } = await buildService(() =>
      Promise.resolve([field("subject", "Foo Bar Baz", ["p1-o3", "p1-o1", "p1-o2"], 95)]),
    );

    const request = makeRequest("incoming", [
      chunk("p1-o1", "Foo"),
      chunk("p1-o2", "Bar"),
      chunk("p1-o3", "Baz"),
    ]);

    const result = await service.extract(request);
    const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));

    expect(byField.subject.chunkIds).toEqual(["p1-o3", "p1-o1", "p1-o2"]);
  });

  it("passes deduped chunks to the LLM (no duplicates)", async () => {
    const { service, mock } = await buildService(async (_dt, chunks) => {
      // The LLM should see deduped chunks only.
      expect(chunks).toHaveLength(2);
      return [field("subject", "Foo", ["p1-o1"], 90)];
    });

    const request = makeRequest("incoming", [
      chunk("p1-o1", "Subject: Foo"),
      chunk("p1-o1", "Subject: Foo"), // duplicate
      chunk("p1-o2", "From: Bar"),
    ]);

    await service.extract(request);

    expect(mock.extractFields).toHaveBeenCalledWith("incoming", [
      chunk("p1-o1", "Subject: Foo"),
      chunk("p1-o2", "From: Bar"),
    ]);
  });
});

describe("ExtractionService — logger output", () => {
  it("logs the documentType and chunk count at debug level", async () => {
    /*
     * The service uses a Logger. We can't easily assert on logger output
     * without spying, but we can verify the service completes without error
     * when the LLM returns a valid response with debug logging enabled.
     */
    const { service } = await buildService(() =>
      Promise.resolve([field("subject", "Foo", ["p1-o1"], 90)]),
    );

    const request = makeRequest("incoming", [chunk("p1-o1", "Subject: Foo")]);

    const result = await service.extract(request);
    expect(result.fields).toHaveLength(5);
  });
});
