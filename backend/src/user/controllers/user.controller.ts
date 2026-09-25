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
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../../auth/authorization/roles.decorator";
import { Role } from "../../auth/authorization/roles.enum";
import { CreateUserDto } from "../dto/create-user-dto";
import { FindDeactivatedUsersQueryDto } from "../dto/find-deactivated-user-query-dto";
import { FindUsersQueryDto } from "../dto/find-user-query-dto";
import { UpdateUserDto } from "../dto/update-user-dto";
import { UpdateUserPasswordDto } from "../dto/update-user-password.dto";
import { UserService } from "../service/user.service";

@Controller("user")
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post("new")
  @Roles(Role.SuperAdmin)
  async create(@Body() userData: CreateUserDto) {
    return await this.service.create(userData);
  }

  @Get("me")
  async getCurrentUser(@Req() req: Request) {
    const user = req.user as {
      id: string;
    };

    return this.service.findCurrentUser(user.id);
  }

  @Get("/search")
  @Roles(Role.SuperAdmin)
  async searchByName(@Query("search") name: string) {
    return this.service.searchByName(name);
  }

  @Get()
  @Roles(Role.SuperAdmin)
  async findAll(@Query() query: FindUsersQueryDto) {
    return this.service.findAll(query);
  }

  @Get("deactivated")
  @Roles(Role.SuperAdmin)
  async findAllDeactivated(@Query() query: FindDeactivatedUsersQueryDto) {
    return this.service.findAllDeactivated(query);
  }

  @Patch("password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SuperAdmin)
  async updateUserPassword(@Body() dto: UpdateUserPasswordDto): Promise<void> {
    await this.service.updateUserPassword(dto);
  }

  @Patch(":id")
  @Roles(Role.SuperAdmin)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<void> {
    await this.service.update(id, dto);
  }

  @Patch(":id/deactivate")
  @Roles(Role.SuperAdmin)
  async deactivate(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.service.deactivate(id);
  }

  @Patch(":id/reactivate")
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivate(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.service.reactivate(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SuperAdmin)
  async delete(@Param("id") id: string): Promise<void> {
    this.service.delete(id);
  }
}
