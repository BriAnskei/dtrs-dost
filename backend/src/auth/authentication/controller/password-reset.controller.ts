import { Body, Controller, Param, ParseUUIDPipe, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../../authorization/roles.decorator";
import { Role } from "../../authorization/roles.enum";
import { Public } from "../decorators/public.decorator";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { PasswordResetService } from "../service/password-reset-token-service";

@Controller("authentication/password-reset")
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post("users/:userId")
  @Roles(Role.Admin, Role.SuperAdmin)
  async createResetRequest(@Param("userId", new ParseUUIDPipe()) userId: string) {
    const result = await this.passwordResetService.createResetRequest(userId);

    return result;
  }

  @Public()
  @Post()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(dto);

    return {
      message: "Password changed successfully",
    };
  }
}
