import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from "@nestjs/common";
import { Roles } from "../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../auth/authorization/enum/roles.enum";
import { FindDeactivatedUsersQueryDto } from "../../user/dto/queries/find-deactivated-user-query-dto";
import { SetUserManagementPermissionDto } from "../dto/client/set-user-management-permission-dto";
import { UserPermissionService } from "../service/user-permission.service";

@Controller("user-permissions")
export class UserPermissionController {
  constructor(private readonly service: UserPermissionService) {}

  @Get("/user-management")
  @Roles(Role.SuperAdmin)
  async findAllUserManagementPermission(@Query() query: FindDeactivatedUsersQueryDto) {
    return this.service.findAllUserManagementPermissions(query);
  }

  @Put("/user-management/:userId")
  @HttpCode(204)
  @Roles(Role.SuperAdmin)
  async setUserManagementPermission(
    @Param("userId") userId: string,
    @Body() dto: SetUserManagementPermissionDto,
  ): Promise<void> {
    await this.service.setUserManagementPermission(userId, dto);
  }

  @Delete(":userId/user-management")
  @HttpCode(204)
  async revokeUserManagementPermission(@Param("userId") userId: string): Promise<void> {
    await this.service.revokeUserManamenetPermission(userId);
  }
}
