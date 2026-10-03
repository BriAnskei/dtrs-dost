import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import type { ExtractionRequestDto } from "./dto/extraction-request-dto";
import type { DocumentDirection } from "./contants/document-direction";
import type {
  ExtractedField,
  ExtractionChunk,
  LlmExtractor,
} from "./providers/llm-extractor.interface";
import { LLM_EXTRACTOR } from "./providers/llm-extractor.interface";
import { ExtractionService } from "./extraction.service";

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
    providers: [
      ExtractionService,
      { provide: LLM_EXTRACTOR, useValue: mock },
    ],
  }).compile();

  return {
    service: moduleRef.get(ExtractionService),
    mock,
  };
}

/* NestJS HttpException stores the body on getResponse(), not on .message. */
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

describe("ExtractionService", () => {
  it("deduplicates duplicate chunkIds in the request instead of throwing 400", async () => {
    const { service, mock } = await buildService(async (_dt, chunks) => {
      // The LLM should receive the deduped (single) chunk, not both copies.
      expect(chunks).toHaveLength(1);
      expect(chunks[0].chunkId).toBe("p1-o1");

      return [field("subject", "Foo", ["p1-o1"], 90)];
    });

    const request = makeRequest("incoming", [
      chunk("p1-o1", "Subject: Foo"),
      chunk("p1-o1", "Subject: Foo"), // duplicate chunkId — recoverable
    ]);

    const result = await service.extract(request);

    expect(mock.extractFields).toHaveBeenCalledTimes(1);
    expect(mock.extractFields).toHaveBeenCalledWith("incoming", [
      chunk("p1-o1", "Subject: Foo"),
    ]);

    // incoming = 5 fields; the one the LLM found resolves, the rest are null.
    expect(result.fields).toHaveLength(5);

    const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
    expect(byField.subject.value).toBe("Foo");
    expect(byField.subject.chunkIds).toEqual(["p1-o1"]);
    expect(byField.from.value).toBeNull();
  });

  it("allows many fields to reference the same chunkId (one source, multiple fields)", async () => {
    const { service } = await buildService(() =>
      Promise.resolve([
        field("subject", "Foo", ["p1-o1"], 90),
        field("from", "Bar", ["p1-o1"], 88),
      ]),
    );

    const request = makeRequest("incoming", [
      chunk("p1-o1", "Subject: Foo From: Bar"),
    ]);

    const result = await service.extract(request);

    const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
    expect(byField.subject.chunkIds).toEqual(["p1-o1"]);
    expect(byField.from.chunkIds).toEqual(["p1-o1"]);
    expect(byField.subject.value).toBe("Foo");
    expect(byField.from.value).toBe("Bar");
  });

  it("throws 400 when the LLM returns a duplicate field key", async () => {
    const { service } = await buildService(() =>
      Promise.resolve([
        field("subject", "Foo", ["p1-o1"], 90),
        field("subject", "Bar", ["p1-o2"], 91), // duplicate FIELD name — genuinely invalid
      ]),
    );

    const request = makeRequest("incoming", [
      chunk("p1-o1", "Subject: Foo"),
      chunk("p1-o2", "Subject: Bar"),
    ]);

    await expectBadRequest(
      () => service.extract(request),
      "Duplicate extracted field: subject",
    );
  });

  it("throws 400 when a field cites a chunkId the client never sent", async () => {
    const { service } = await buildService(() =>
      Promise.resolve([field("subject", "Foo", ["p2-o1"], 90)]),
    );

    const request = makeRequest("incoming", [
      chunk("p1-o1", "nothing useful here"),
    ]);

    await expectBadRequest(
      () => service.extract(request),
      'Invalid chunkId "p2-o1" returned for field "subject"',
    );
  });

  it("throws 400 when an extracted value is absent from the cited chunk", async () => {
    const { service } = await buildService(() =>
      Promise.resolve([field("subject", "Foo", ["p1-o1"], 90)]),
    );

    const request = makeRequest("incoming", [
      chunk("p1-o1", "completely unrelated text"),
    ]);

    await expectBadRequest(
      () => service.extract(request),
      'Extracted value for "subject" was not found in any document chunk',
    );
  });

  it("does not throw when a value spans chunks beyond the cited one", async () => {
    // A multi-line title split across OCR line-chunks: the LLM cites the first
    // chunk (p1-o1), but the full value only exists in the document union, not
    // in that single chunk's text.
    const { service, mock } = await buildService(async (_dt, chunks) => {
      expect(chunks).toHaveLength(2);

      return [field("subject", "ACTION PLAN PRESENTATION", ["p1-o1"], 98)];
    });

    const request = makeRequest("incoming", [
      chunk("p1-o1", "ACTION PLAN"), // cited chunk
      chunk("p1-o2", "PRESENTATION OF DEPARTMENT"), // value continues here
    ]);

    const result = await service.extract(request);

    expect(mock.extractFields).toHaveBeenCalledTimes(1);

    const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
    expect(byField.subject.value).toBe("ACTION PLAN PRESENTATION");
    expect(byField.subject.chunkIds).toEqual(["p1-o1"]);
  });

  it("fills null for fields the LLM omitted", async () => {
    const { service } = await buildService(() =>
      Promise.resolve([field("subject", "Foo", ["p1-o1"], 90)]),
    );

    const request = makeRequest("incoming", [chunk("p1-o1", "Subject: Foo")]);

    const result = await service.extract(request);

    const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
    expect(byField.subject.value).toBe("Foo");
    expect(byField.from.value).toBeNull();
    expect(byField.from.chunkIds).toEqual([]);
    expect(byField.to.value).toBeNull();
  });

  it("accepts value:null + empty chunkIds as a valid not-found field", async () => {
    const { service } = await buildService(() =>
      Promise.resolve([field("subject", null, [], null)]),
    );

    const request = makeRequest("incoming", [
      chunk("p1-o1", "no subject here"),
    ]);

    const result = await service.extract(request);

    const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
    expect(byField.subject.value).toBeNull();
    expect(byField.subject.chunkIds).toEqual([]);
  });
});
