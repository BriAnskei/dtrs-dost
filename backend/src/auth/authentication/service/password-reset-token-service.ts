import { createHash, randomBytes } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { DataSource } from "typeorm";
import { UserRepository } from "../../../user/repository/user.repository";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { PasswordResetTokenEntity } from "../entities/password-reset-token.entity";
import { PasswordResetRepository } from "../repository/password-reset-token-repository";
import { RefreshTokenRepository } from "../repository/refresh-token.repository";
@Injectable()
export class PasswordResetService {
  private readonly resetTokenTtlMs = 15 * 60 * 1000;

  constructor(
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly dataSource: DataSource,
  ) {}

  private generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  private hashToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  async createResetRequest(userId: string): Promise<{
    token: string;
    expires_at: Date;
  }> {
    const rawToken = this.generateToken();

    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(Date.now() + this.resetTokenTtlMs);

    await this.passwordResetRepository.deleteByUserId(userId);

    await this.passwordResetRepository.createToken(userId, tokenHash, expiresAt);

    return {
      token: rawToken,
      expires_at: expiresAt,
    };
  }

  async findByToken(token: string): Promise<PasswordResetTokenEntity> {
    const tokenHash = this.hashToken(token);

    const resetToken = await this.passwordResetRepository.findByTokenHash(tokenHash);

    if (!resetToken) throw new BadRequestException("Invalid or expired reset token");

    if (resetToken.expires_at.getTime() <= Date.now()) {
      await this.passwordResetRepository.delete(resetToken.id);
      throw new BadRequestException("Expired password reset link");
    }

    return resetToken;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = createHash("sha256").update(dto.token).digest("hex");

    await this.dataSource.transaction(async (manager) => {
      const resetToken =
        await this.passwordResetRepository.findByTokenHashForUpdate(tokenHash);

      if (!resetToken || resetToken.expires_at.getTime() <= Date.now()) {
        throw new BadRequestException("Invalid or expired password reset link");
      }

      const newPassword = await argon2.hash(dto.new_password);

      const res = await this.userRepository.updatePassword(
        resetToken.user_id,
        newPassword,
        manager,
      );

      if (!res) throw new NotFoundException("User does not exist");

      await this.refreshTokenRepository.deleteByUserId(resetToken.user_id, manager);

      await this.passwordResetRepository.delete(resetToken.id, manager);
    });
  }
}
