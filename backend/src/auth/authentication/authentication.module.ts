import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "../../features/user/user.module";
import { JwtAuthGuard } from "../../middleware/auth";
import { AuthenticationController } from "./controller/authentication.controller";
import { PasswordResetController } from "./controller/password-reset.controller";
import { PasswordResetTokenEntity } from "./entities/password-reset-token.entity";
import { RefreshTokenEntity } from "./entities/refresh-token.entity";
import { LoginThrottlerGuard } from "./guard/login-throttler.guard";
import { PasswordResetRepository } from "./repository/password-reset-token-repository";
import { RefreshTokenRepository } from "./repository/refresh-token.repository";
import { AuthenticationService } from "./service/authentication.service";
import { PasswordResetService } from "./service/password-reset-token-service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    UserModule,
    ConfigModule,
    TypeOrmModule.forFeature([RefreshTokenEntity, PasswordResetTokenEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
  ],
  controllers: [AuthenticationController, PasswordResetController],
  providers: [
    AuthenticationService,
    PasswordResetService,
    PasswordResetRepository,
    RefreshTokenRepository,
    JwtStrategy,
    JwtAuthGuard,
    LoginThrottlerGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
  ],
  exports: [JwtModule],
})
export class AuthenticationModule {}
