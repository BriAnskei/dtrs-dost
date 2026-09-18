import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { Roles } from "../../auth/authorization/roles.decorator";
import { Role } from "../../auth/authorization/roles.enum";
import { UpdateDivisionDto } from "../dto/update-division-dto";
import { DivisionService } from "../service/division.service";

@Controller("division")
export class DivisionController {
  constructor(private readonly service: DivisionService) {}

  @Get()
  @Roles(Role.SuperAdmin)
  async findByName(@Query("search") search: string) {
    return this.service.searchByName(search);
  }

  @Get("with-users")
  @Roles(Role.SuperAdmin)
  async findAllWithUsers() {
    return this.service.findAllWithUsers();
  }

  @Patch(":id")
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateName(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDivisionDto,
  ) {
    return this.service.updateName(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SuperAdmin)
  async delete(id: string) {
    return this.service.delete(id);
  }
}
