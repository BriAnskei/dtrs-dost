import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../../auth/authorization/roles.decorator";
import { Role } from "../../auth/authorization/roles.enum";
import { CreateUserDto } from "../dto/create-user-dto";
import { UserService } from "../service/user.service";

@Controller("user")
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get("me")
  async getCurrentUser(@Req() req: Request) {
    const user = req.user as {
      id: string;
    };

    return this.service.findById(user.id);
  }

  @Post("new")
  @Roles(Role.SuperAdmin)
  async create(@Body() userData: CreateUserDto) {
    return await this.service.create(userData);
  }

  @Get()
  @Roles(Role.SuperAdmin)
  async findAll() {
    return this.service.findAll();
  }

  @Patch(":id/deactivate")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SuperAdmin)
  async deactivate(id: string): Promise<void> {
    this.service.deactivate(id);
  }

  @Patch(":id/deactivate")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SuperAdmin)
  async delete(id: string): Promise<void> {
    this.service.delete(id);
  }
}
