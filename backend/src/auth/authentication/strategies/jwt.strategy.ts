import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserService } from "../../../features/user/service/user.service";
import { Role } from "../../authorization/enum/roles.enum";
import { AuthenticatedUser } from "../types/authenticated-user";

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request.cookies?.access_token,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException("Invalid token payload");
    }

    const user = await this.userService.findByIdForAuth(payload.sub);

    if (!user || (user && !user.is_active)) {
      throw new UnauthorizedException("User is inactive or not found");
    }

    return {
      id: user.id,
      email: user.email,
      role_id: Number(user.role_id),
      user_management_permissions:
        Number(user.role_id) === Role.Admin &&
        user.user_permissions?.managementPermissions
          ? {
              view: user.user_permissions.managementPermissions !== undefined,
              add: user.user_permissions.managementPermissions.add,
              edit: user.user_permissions.managementPermissions.edit,
              reset_password: user.user_permissions.managementPermissions.reset_password,
              deactivate: user.user_permissions.managementPermissions.deactivate,
              reactivate: user.user_permissions.managementPermissions.reactivate,
              delete: user.user_permissions.managementPermissions.delete,
            }
          : null,
    };
  }
}
