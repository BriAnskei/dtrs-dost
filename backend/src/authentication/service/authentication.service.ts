import { createHash, randomBytes } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { UserEntity } from "../../user/entities/user.entity";
import { UserRepository } from "../../user/user.repository";
import type { LoginDto } from "../dto/login.dto";
import type { RefreshTokenDto } from "../dto/refresh-token.dto";
import type { RefreshTokenEntity } from "../entities/refresh-token.entity";
import { RefreshTokenRepository } from "../repository/refresh-token.repository";

@Injectable()
export class AuthenticationService {
  private readonly refreshTokenExpirationMs = {
    default: 24 * 60 * 60 * 1000, // 1 day
    rememberMe: 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto.email, dto.password);

    await this.refreshTokenRepository.deleteExpiredByUserId(user.id);

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, dto.remember_me);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      refresh_token_max_age_ms: dto.remember_me
        ? this.refreshTokenExpirationMs.rememberMe
        : this.refreshTokenExpirationMs.default,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashRefreshToken(dto.refresh_token);

    const storedToken = await this.refreshTokenRepository.findOne(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (storedToken.expires_at <= new Date()) {
      await this.refreshTokenRepository.delete(storedToken.id);

      throw new UnauthorizedException("Refresh token expired");
    }

    const user = await this.userRepository.findById(storedToken.user_id);

    if (!user?.is_active) {
      throw new UnauthorizedException("User is not active");
    }

    await this.refreshTokenRepository.delete(storedToken.id);

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, storedToken.remembered);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);

    await this.refreshTokenRepository.deleteByTokenHash(tokenHash);

    return {
      message: "Logged out successfully",
    };
  }

  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<UserEntity> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.is_active) {
      throw new UnauthorizedException("User account is inactive");
    }

    const passwordMatches = await argon2.verify(user.password, password);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  private async generateAccessToken(user: UserEntity): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role_id: user.role_id,
      },
      { expiresIn: "15m" },
    );
  }

  private async createRefreshToken(
    userId: string,
    remember_me: boolean,
  ): Promise<string> {
    const refreshToken = randomBytes(64).toString("hex");

    const tokenHash = this.hashRefreshToken(refreshToken);

    const expiresAt = new Date(
      Date.now() +
        (remember_me
          ? this.refreshTokenExpirationMs.rememberMe
          : this.refreshTokenExpirationMs.default),
    );

    await this.refreshTokenRepository.save({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      remembered: remember_me,
    } as RefreshTokenEntity);

    return refreshToken;
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash("sha256").update(refreshToken).digest("hex");
  }
}
