import { Body, Controller, Post } from "@nestjs/common";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { ExtractionRequestDto } from "../dto/extraction-request-dto";
import { ExtractionResponseDto } from "../dto/extraction-response-dto";
import { ExtractionService } from "../extraction.service";

@Controller("extraction")
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post()
  @Roles(Role.SuperAdmin, Role.Admin)
  extract(@Body() request: ExtractionRequestDto): Promise<ExtractionResponseDto> {
    return this.extractionService.extract(request);
  }
}
