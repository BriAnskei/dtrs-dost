import { FieldKey } from "../contants/extraction-field";

export class FieldExtractionDto {
  field!: FieldKey;
  value!: string | null;
  chunkIds!: string[];
  aiConfidence!: number | null;
}

export class ExtractionResponseDto {
  fields!: FieldExtractionDto[];
}
