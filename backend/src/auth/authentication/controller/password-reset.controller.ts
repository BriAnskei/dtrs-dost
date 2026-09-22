import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { Roles } from "../../authorization/roles.decorator";
import { Role } from "../../authorization/roles.enum";
import { Public } from "../decorators/public.decorator";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { PasswordResetService } from "../service/password-reset-token-service";

@Controller("authentication/password-reset")
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}

  @Post("users/:userId")
  @Roles(Role.SuperAdmin)
  async createResetRequest(@Param("userId", new ParseUUIDPipe()) userId: string) {
    const result = await this.service.createResetRequest(userId);

    return result;
  }

  @Get("user/:userId")
  @Roles(Role.SuperAdmin)
  async findByUserId(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.service.findByUserId(userId);
  }

  @Get("/verify")
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyPasswordResetToken(@Query("token") token: string) {
    const resetToken = await this.service.findByToken(token);

    return {
      valid: true,
      resetToken,
    };
  }

  @Public()
  @Post()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.service.resetPassword(dto);

    return {
      message: "Password changed successfully",
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SuperAdmin)
  async delete(@Param("id") id: string): Promise<void> {
    await this.service.delete(id);
  }
}
