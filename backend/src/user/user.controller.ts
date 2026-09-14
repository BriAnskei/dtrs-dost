import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { UserService } from "./user.service";

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
}
