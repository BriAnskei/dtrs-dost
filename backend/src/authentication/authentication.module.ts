import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtAuthGuard } from "../middleware/auth";
import { UserModule } from "../user/user.module";
import { AuthenticationController } from "./controller/authentication.controller";
import { RefreshTokenEntity } from "./entities/refresh-token.entity";
import { LoginThrottlerGuard } from "./guard/login-throttler.guard";
import { RefreshTokenRepository } from "./repository/refresh-token.repository";
import { AuthenticationService } from "./service/authentication.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    UserModule,
    ConfigModule,
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    RefreshTokenRepository,
    JwtStrategy,
    JwtAuthGuard,
    LoginThrottlerGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
  ],
  exports: [JwtModule],
})
export class AuthenticationModule {}
