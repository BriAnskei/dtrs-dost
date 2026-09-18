import { Controller, Get, Query } from "@nestjs/common";
import { DivisionService } from "../service/division.service";

@Controller("division")
export class DivisionController {
  constructor(private readonly service: DivisionService) {}

  @Get()
  async findByName(@Query("search") search: string) {
    return this.service.searchByName(search);
  }
}
