import { GoogleGenAI } from "@google/genai";
import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentDirection } from "../contants/document-direction";
import { FIELDS_BY_DIRECTION } from "../contants/extraction-field";
import { buildExtractionPrompt } from "../prompts/extraction-prompt";
import { extractionResponseSchema } from "../schemas/extraction-response.schema";
import { ExtractedField, ExtractionChunk, LlmExtractor } from "./llm-extractor.interface";

@Injectable()
export class GeminiExtractorService implements LlmExtractor {
  private readonly logger = new Logger(GeminiExtractorService.name);

  private readonly client: GoogleGenAI;
  private readonly model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

  private readonly maxAttempts = 4;
  private readonly initialRetryDelayMs = 1_000;

  constructor(private readonly configService: ConfigService) {
    const apiKey = ":-)";

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    this.client = new GoogleGenAI({
      apiKey,
    });
  }

  async extractFields(
    documentType: DocumentDirection,
    chunks: ExtractionChunk[],
  ): Promise<ExtractedField[]> {
    const prompt = buildExtractionPrompt(documentType, chunks);

    try {
      const response = await this.generateContentWithRetry(documentType, prompt);

      if (!response.text) {
        throw new Error("Gemini returned an empty response");
      }

      const parsed = JSON.parse(response.text);

      let validated: { fields: ExtractedField[] };
      try {
        validated = extractionResponseSchema.parse(parsed);
      } catch (validationError) {
        this.logger.error(
          "Gemini response failed schema validation",
          validationError instanceof Error
            ? validationError.stack
            : String(validationError),
        );
        this.logger.debug(`Invalid Gemini payload: ${JSON.stringify(parsed)}`);
        throw validationError;
      }

      return validated.fields;
    } catch (error) {
      this.logger.error(
        "Gemini extraction failed",
        error instanceof Error ? error.stack : String(error),
      );

      throw new BadGatewayException({
        success: false,
        error: "The document extraction service is currently unavailable.",
      });
    }
  }

  private async generateContentWithRetry(
    documentType: DocumentDirection,
    prompt: string,
  ) {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.client.models.generateContent({
          model: "gemini-3-flash-preview",

          contents: prompt,

          config: {
            responseMimeType: "application/json",

            responseJsonSchema: this.buildResponseSchema(documentType),

            // Deterministic output: temperature 0 + fixed seed ensures the
            // same prompt always yields the same LLM response (values and
            // aiConfidence scores), eliminating run-to-run variance.
            temperature: 0,
            seed: 42,
          },
        });
      } catch (error) {
        console.log("Error: ", error);
        const retryable = this.isRetryableError(error);

        if (!retryable || attempt === this.maxAttempts) {
          throw error;
        }

        const delay = this.calculateRetryDelay(attempt);

        this.logger.warn(
          `Gemini request failed with a retryable error. ` +
            `Retrying in ${delay}ms ` +
            `(attempt ${attempt}/${this.maxAttempts}).`,
        );

        await this.sleep(delay);
      }
    }

    throw new Error("Gemini retry loop exited unexpectedly");
  }

  private isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const candidate = error as {
      status?: number;
      code?: number;
      message?: string;
    };

    const status = candidate.status ?? candidate.code;

    if (
      status === 408 ||
      status === 429 ||
      status === 500 ||
      status === 503 ||
      status === 504
    ) {
      return true;
    }

    const message = candidate.message?.toLowerCase() ?? "";

    return (
      message.includes("service unavailable") ||
      message.includes("high demand") ||
      message.includes("temporarily unavailable") ||
      message.includes("overloaded")
    );
  }

  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = this.initialRetryDelayMs * 2 ** (attempt - 1);

    // Deterministic jitter derived from the attempt number so retry timing is
    // reproducible. A seeded PRNG would also work; this simple formula avoids
    // Math.random() non-determinism while still preventing synchronized retries
    // across parallel clients (the base exponential delay already varies).
    const jitter = (attempt * 137) % 500;

    return exponentialDelay + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildResponseSchema(documentType: DocumentDirection): Record<string, unknown> {
    const fields = FIELDS_BY_DIRECTION[documentType];

    return {
      type: "object",

      properties: {
        fields: {
          type: "array",

          minItems: fields.length,
          maxItems: fields.length,

          items: {
            type: "object",

            properties: {
              field: {
                type: "string",
                enum: fields,
              },

              value: {
                type: ["string", "null"],
              },

              chunkIds: {
                type: "array",

                items: { type: "string" },
              },

              aiConfidence: {
                type: ["number", "null"],
              },
            },

            required: ["field", "value", "chunkIds", "aiConfidence"],

            additionalProperties: false,
          },
        },
      },

      required: ["fields"],

      additionalProperties: false,
    };
  }
}
