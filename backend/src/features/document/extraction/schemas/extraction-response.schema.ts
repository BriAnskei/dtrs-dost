import { z } from "zod";

export const extractionResponseSchema = z.object({
  fields: z.array(
    z.object({
      field: z.enum(["subject", "from", "to", "dateReceived", "datePrepared", "summary"]),

      value: z.string().nullable(),

      chunkIds: z.array(z.string()),

      aiConfidence: z.number().min(0).max(100).nullable(),
    }),
  ),
});

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;
