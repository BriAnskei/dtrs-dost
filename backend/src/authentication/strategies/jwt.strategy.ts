import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";

interface JwtPayload {
  sub: string;
  email: string;
  role_id: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request.cookies?.access_token,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException("Invalid token payload");
    }

    // User management feature
    // const user = await this.userService.findById(payload.sub);

    //  if (!user || !user.is_active) {
    //    throw new UnauthorizedException("User is inactive or not found");
    //  }

    return {
      id: payload.sub,
      email: payload.email,
      role_id: payload.role_id,
    };
  }
}
