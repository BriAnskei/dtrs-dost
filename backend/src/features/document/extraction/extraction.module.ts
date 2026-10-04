import { Module } from "@nestjs/common";
import { ExtractionController } from "./controller/extraction.controller";
import { ExtractionService } from "./extraction.service";
import { GeminiExtractorService } from "./providers/gemini-extractor.service";
import { LLM_EXTRACTOR } from "./providers/llm-extractor.interface";

@Module({
  controllers: [ExtractionController],

  providers: [
    ExtractionService,
    GeminiExtractorService,
    {
      provide: LLM_EXTRACTOR,
      useExisting: GeminiExtractorService,
    },
  ],

  exports: [ExtractionService],
})
export class ExtractionModule {}
