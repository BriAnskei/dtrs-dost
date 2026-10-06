import type { DocumentDirection } from "../contants/document-direction";
import type { ExtractionRequestDto } from "../dto/extraction-request-dto";
import type {
  ExtractedField,
  ExtractionChunk,
} from "../providers/llm-extractor.interface";

export interface DocumentExtractionTestCase {
  name: string;
  documentType: DocumentDirection;
  chunks: ExtractionChunk[];
  llmFields: ExtractedField[];
  expectedFields: ExtractedField[];
  notes?: string;
}

export function makeChunk(chunkId: string, text: string): ExtractionChunk {
  return { chunkId, text };
}

export function makeField(
  fieldKey: ExtractedField["field"],
  value: string | null,
  chunkIds: string[],
  aiConfidence: number | null,
): ExtractedField {
  return {
    field: fieldKey,
    value,
    chunkIds,
    aiConfidence,
  };
}

export function makeRequest(
  documentType: DocumentDirection,
  chunks: ExtractionChunk[],
): ExtractionRequestDto {
  return {
    documentType,
    chunks,
  } as ExtractionRequestDto;
}

export const incomingHappyPathCase: DocumentExtractionTestCase = {
  name: "incoming-happy-path",
  documentType: "incoming",
  chunks: [
    makeChunk("p1-o1", "Subject: Request for vendor review"),
    makeChunk("p1-o2", "From: Jane Doe"),
    makeChunk("p1-o3", "To: Finance Team"),
    makeChunk("p1-o4", "Date: 2026-10-03"),
  ],
  llmFields: [
    makeField("subject", "Request for vendor review", ["p1-o1"], 96),
    makeField("from", "Jane Doe", ["p1-o2"], 94),
    makeField("to", "Finance Team", ["p1-o3"], 92),
    makeField("dateReceived", "2026-10-03", ["p1-o4"], 98),
    makeField("summary", "Vendor review request for finance approval.", ["p1-o1"], 90),
  ],
  expectedFields: [
    makeField("subject", "Request for vendor review", ["p1-o1"], 96),
    makeField("from", "Jane Doe", ["p1-o2"], 94),
    makeField("to", "Finance Team", ["p1-o3"], 92),
    makeField("dateReceived", "2026-10-03", ["p1-o4"], 98),
    makeField("summary", "Vendor review request for finance approval.", ["p1-o1"], 90),
  ],
  notes: "Standard incoming document where every field is present and cited.",
};

export const outgoingHappyPathCase: DocumentExtractionTestCase = {
  name: "outgoing-happy-path",
  documentType: "outgoing",
  chunks: [
    makeChunk("p1-o1", "To: Northwind Holdings"),
    makeChunk("p1-o2", "Subject: Q3 Budget Summary"),
    makeChunk("p1-o3", "Date: 2026-10-01"),
  ],
  llmFields: [
    makeField("to", "Northwind Holdings", ["p1-o1"], 95),
    makeField("subject", "Q3 Budget Summary", ["p1-o2"], 97),
    makeField("dateReleased", "2026-10-01", ["p1-o3"], 92),
    makeField("summary", "Budget summary for the third quarter.", ["p1-o2"], 88),
  ],
  expectedFields: [
    makeField("to", "Northwind Holdings", ["p1-o1"], 95),
    makeField("subject", "Q3 Budget Summary", ["p1-o2"], 97),
    makeField("dateReleased", "2026-10-01", ["p1-o3"], 92),
    makeField("summary", "Budget summary for the third quarter.", ["p1-o2"], 88),
  ],
  notes: "Standard outgoing document using the 4-field outgoing schema.",
};

export const multiLineSubjectCase: DocumentExtractionTestCase = {
  name: "multi-line-subject",
  documentType: "incoming",
  chunks: [
    makeChunk("p1-o1", "Subject: Vendor"),
    makeChunk("p1-o2", "Compliance Review"),
    makeChunk("p1-o3", "From: Internal Audit"),
  ],
  llmFields: [
    makeField("subject", "Vendor Compliance Review", ["p1-o1"], 92),
    makeField("from", "Internal Audit", ["p1-o3"], 83),
    makeField("to", null, [], null),
    makeField("dateReceived", null, [], null),
    makeField("summary", "Review of vendor compliance controls.", ["p1-o2"], 78),
  ],
  expectedFields: [
    makeField("subject", "Vendor Compliance Review", ["p1-o1"], 92),
    makeField("from", "Internal Audit", ["p1-o3"], 83),
    makeField("to", null, [], null),
    makeField("dateReceived", null, [], null),
    makeField("summary", "Review of vendor compliance controls.", ["p1-o2"], 78),
  ],
  notes: "Value spans multiple chunks but remains a valid document-level match.",
};

export const missingFieldCase: DocumentExtractionTestCase = {
  name: "missing-field-null",
  documentType: "incoming",
  chunks: [
    makeChunk("p1-o1", "From: Jane Doe"),
    makeChunk("p1-o2", "Subject: Invoice 2049"),
  ],
  llmFields: [
    makeField("subject", "Invoice 2049", ["p1-o2"], 90),
    makeField("from", "Jane Doe", ["p1-o1"], 88),
    makeField("to", null, [], null),
    makeField("dateReceived", null, [], null),
    makeField("summary", null, [], null),
  ],
  expectedFields: [
    makeField("subject", "Invoice 2049", ["p1-o2"], 90),
    makeField("from", "Jane Doe", ["p1-o1"], 88),
    makeField("to", null, [], null),
    makeField("dateReceived", null, [], null),
    makeField("summary", null, [], null),
  ],
  notes: "A valid negative case where the model correctly returns null for missing fields.",
};

export const documentExtractionTestCases: DocumentExtractionTestCase[] = [
  incomingHappyPathCase,
  outgoingHappyPathCase,
  multiLineSubjectCase,
  missingFieldCase,
];
