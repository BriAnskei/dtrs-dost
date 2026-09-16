import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../../auth/authorization/roles.decorator";
import { Role } from "../../auth/authorization/roles.enum";
import { CreateUserDto } from "../dto/create-user-dto";
import { UserService } from "../user.service";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  async getCurrentUser(@Req() req: Request) {
    const user = req.user as {
      id: string;
    };

    return this.userService.findById(user.id);
  }

  @Post()
  @Roles(Role.SuperAdmin)
  async create(@Body() userData: CreateUserDto) {
    return await this.userService.create(userData);
  }
}
