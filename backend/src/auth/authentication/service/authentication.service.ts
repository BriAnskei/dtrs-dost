import { createHash, randomBytes } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { DataSource, EntityManager } from "typeorm";
import type { UserEntity } from "../../../user/entities/user.entity";
import { UserRepository } from "../../../user/repository/user.repository";
import type { LoginDto } from "../dto/login.dto";
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
    private readonly dataSource: DataSource,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto.email, dto.password);

    await this.refreshTokenRepository.deleteExpiredByUserId(user.id);

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, dto.remember_me);

    return {
      user_data: {
        id: user.id,
        division_id: user.division_id,
        full_name: user.full_name,
        role_id: user.role_id,
        email: user.email,
        contect_number: user.contact_number,
        is_active: user.is_active,
      },

      access_token: accessToken,
      refresh_token: refreshToken,
      refresh_token_max_age_ms: dto.remember_me
        ? this.refreshTokenExpirationMs.rememberMe
        : this.refreshTokenExpirationMs.default,
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token not found");
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    return this.dataSource.transaction(async (manager) => {
      const storedToken = await this.refreshTokenRepository.consume(tokenHash, manager);

      if (!storedToken) {
        throw new UnauthorizedException("Invalid or expired refresh token");
      }

      const user = await this.userRepository.findById(storedToken.user_id, manager);

      if (!user?.is_active) {
        throw new UnauthorizedException("User is not active");
      }

      const accessToken = await this.generateAccessToken(user);

      const refreshTokenValue = await this.createRefreshToken(
        user.id,
        storedToken.remembered,
        manager,
      );

      return {
        access_token: accessToken,
        refresh_token: refreshTokenValue,

        refresh_token_max_age_ms: storedToken.remembered
          ? this.refreshTokenExpirationMs.rememberMe
          : this.refreshTokenExpirationMs.default,
      };
    });
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      return {
        message: "Logged out successfully",
      };
    }
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
    
    
    if(!user.is_active)
      throw new UnauthorizedException("Account has been deactivated");

    await this.verifyPassword(user.id, password, user);

    return user;
  }

  async verifyPassword(
    userId: string,
    password: string,
    user?: UserEntity,
  ): Promise<void> {
    const userData = user ?? (await this.userRepository.findById(userId));

    if (!userData) throw new UnauthorizedException("Invalid credentials");

    const passwordMatches = await argon2.verify(userData.password, password);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }
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
    rememberMe: boolean,
    manager?: EntityManager,
  ): Promise<string> {
    const refreshToken = randomBytes(64).toString("hex");

    const tokenHash = this.hashRefreshToken(refreshToken);

    const expiresAt = new Date(
      Date.now() +
        (rememberMe
          ? this.refreshTokenExpirationMs.rememberMe
          : this.refreshTokenExpirationMs.default),
    );

    await this.refreshTokenRepository.save(
      {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        remembered: rememberMe,
      } as Partial<RefreshTokenEntity>,
      manager ?? this.dataSource.manager,
    );

    return refreshToken;
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash("sha256").update(refreshToken).digest("hex");
  }
}
