import { z } from 'zod';
import {
  SchemaType,
  type Schema,
  type ObjectSchema,
  type StringSchema,
  type ArraySchema,
} from '@google/generative-ai';

// ── Zod schemas (for response validation) ──────────────────────

export const GeminiExtractionSchema = z.object({
  subject: z.string(),
  from: z.string(),
  to: z.string(),
  date_received: z.string(),
  time_received: z.string().optional(),
  summary: z.string().optional(),
  routed_to: z.array(z.string()).optional(), // division names, as returned by Gemini
});

export type GeminiExtractionType = z.infer<typeof GeminiExtractionSchema>;

export const CreateExtractionResponseSchema = GeminiExtractionSchema.extend({
  idCode: z.string().optional(),
  routedTo: z.array(z.string()).optional(), // fixed: was a single string, should be an array (matches DivisionMultiSelect)
  noticeOfAction: z.string().optional(),
  actionTaken: z.string().optional(),
});

export type CreateExtractionResponseType = z.infer<
  typeof CreateExtractionResponseSchema
>;

// ── Gemini SDK schemas (for responseSchema) ────────────────────
// Built per-request now, since the division enum depends on live DB data.

export function buildGeminiExtractionSchema(
  divisionNames: string[],
): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      subject: { type: SchemaType.STRING } as StringSchema,
      from: { type: SchemaType.STRING } as StringSchema,
      to: { type: SchemaType.STRING } as StringSchema,
      date_received: { type: SchemaType.STRING } as StringSchema,
      time_received: { type: SchemaType.STRING } as StringSchema,
      summary: { type: SchemaType.STRING } as StringSchema,
      routed_to: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: divisionNames,
        } as StringSchema,
      } as ArraySchema,
    },
    required: ['subject', 'from', 'to', 'date_received'],
  };
}
