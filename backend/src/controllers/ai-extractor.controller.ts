import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateExtractionResponseSchema,
  buildGeminiExtractionSchema,
} from '../schema/Extraction.schema';
import { getGenerativeModel } from '../util/ai';
import { Division } from '../entities/division.entity';

interface ExtractRequest {
  prompt: string;
  systemInstruction: string;
}

const DIVISION_CLASSIFICATION_GUIDE = `
You must also determine which division(s) this document should be routed to, based on its content.
This is for a Provincial Engineering Office (PEO). Use these guidelines:
- Operations: requests for trucks, gravel, heavy equipment, road/bridge work, field inspections, construction materials, project implementation.
- Finance: budget requests, disbursement vouchers, billing, payments, procurement funding.
- Human Resources: personnel matters, leave requests, hiring, training, employee concerns.
- Information Technology: IT equipment requests, system/network issues, software support.
- Legal Affairs: contracts, permits, legal opinions, compliance, disputes.

Return "routed_to" as an array containing one or more of the exact division names provided in the schema's enum.
Prefer a single best-fit division. Only include more than one when the document genuinely spans multiple divisions
(e.g. a request that requires both equipment deployment and its funding approval).
`;

@Controller('ai')
export class AiExtractorController {
  constructor(
    @InjectRepository(Division)
    private readonly divisionRepository: Repository<Division>,
  ) {}

  @Post('extract')
  @HttpCode(HttpStatus.OK)
  async generateHandler(@Body() body: ExtractRequest) {
    const { prompt, systemInstruction } = body;
    if (!prompt || !systemInstruction) {
      return {
        success: false,
        error: 'Missing fields',
      };
    }

    const divisions = await this.divisionRepository.find();
    const divisionNameToId = new Map(
      divisions.map((d) => [d.division_name.trim().toLowerCase(), d.id]),
    );
    const divisionNames = divisions.map((d) => d.division_name);

    const fullSystemInstruction = `${systemInstruction}\n\n${DIVISION_CLASSIFICATION_GUIDE}`;

    const model = getGenerativeModel({
      systemInstruction: fullSystemInstruction,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: buildGeminiExtractionSchema(divisionNames),
      },
    });

    let MAX_ATTEMPTS = 2;
    let lastError: string | undefined;
    while (MAX_ATTEMPTS > 0) {
      try {
        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        let json: unknown;
        try {
          json = JSON.parse(rawText);
        } catch {
          lastError = 'Model returned invalid JSON';
          MAX_ATTEMPTS--;
          continue;
        }
        const parsed = CreateExtractionResponseSchema.safeParse(json);
        console.log('parsed data: ', parsed);

        if (parsed.success) {
          // Gemini returns division *names* (schema-enforced). The UI works with division
          // *ids*, so map them back before responding to the client.
          const routedToIds = (parsed.data.routed_to ?? [])
            .map((name) => divisionNameToId.get(name.trim().toLowerCase()))
            .filter((id): id is string => !!id);

          console.log('final routedToIds:', routedToIds);
          return {
            success: true,
            res: {
              ...parsed.data,
              time_received: parsed.data.time_received ?? '',
              summary: parsed.data.summary ?? '',
              routed_to: routedToIds,
            },
          };
        }
        lastError = parsed.error.message;
      } catch (err: any) {
        lastError = err.message;
      }
      MAX_ATTEMPTS--;
    }
    return {
      success: false,
      error: lastError ?? 'Failed request',
    };
  }
}
