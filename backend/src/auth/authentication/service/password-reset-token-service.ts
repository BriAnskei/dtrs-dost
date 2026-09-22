import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
    id: string;
    token: string;
    expires_at: Date;
  }> {
    const existingToken = await this.findByUserId(userId);

    if (existingToken) {
      throw new ConflictException({
        message: "A password reset request already exists.",
        error: "PASSWORD_RESET_ALREADY_EXISTS",
        expires_at: existingToken.expires_at,
      });
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.resetTokenTtlMs);

    const created = await this.passwordResetRepository.createToken(
      userId,
      tokenHash,
      expiresAt,
    );

    return {
      id: created.id,
      token: rawToken,
      expires_at: expiresAt,
    };
  }

  async findByUserId(userId: string): Promise<PasswordResetTokenEntity | null> {
    return this.passwordResetRepository.findByUserId(userId);
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
    const tokenHash = this.hashToken(dto.token);

    await this.dataSource.transaction(async (manager) => {
      const resetToken = await this.passwordResetRepository.findByTokenHashForUpdate(
        tokenHash,
        manager,
      );

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

  async delete(id: string) {
    const res = await this.passwordResetRepository.delete(id);

    if (!res) throw new Error("Password token not found");
  }
}
