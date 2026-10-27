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
import { RequirePermission } from "../../../auth/authorization/decorator/permissions.decorator";
import { Roles } from "../../../auth/authorization/decorator/roles.decorator";
import { PermissionDomain } from "../../../auth/authorization/enum/permission-domain.enum";
import { Role } from "../../../auth/authorization/enum/roles.enum";
import { UserManagementPermission } from "../../../auth/authorization/enum/user-management-permissions.enum";
import { FindDivisionsQueryDto } from "../dto/queries/find-divisions-query-dto";
import { UpdateDivisionDto } from "../dto/updates/update-division-dto";
import { DivisionService } from "../service/division.service";
@Controller("division")
export class DivisionController {
  constructor(private readonly service: DivisionService) {}

  @Get("search")
  @Roles(Role.SuperAdmin)
  async findByName(@Query("search") search: string) {
    return this.service.searchByName(search);
  }

  @Get()
  @Roles(Role.SuperAdmin, Role.Admin)
  @RequirePermission(PermissionDomain.UserManagement, UserManagementPermission.View)
  async findAll(@Query() query: FindDivisionsQueryDto) {
    return this.service.findAll(query);
  }

  @Patch(":id")
  @Roles(Role.SuperAdmin, Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PermissionDomain.UserManagement, UserManagementPermission.View)
  async updateName(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDivisionDto,
  ) {
    return this.service.updateName(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SuperAdmin, Role.Admin)
  @RequirePermission(PermissionDomain.UserManagement, UserManagementPermission.View)
  async delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
