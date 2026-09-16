import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { ROLES_KEY } from "./roles.decorator";
import { Role } from "./roles.enum";

interface AuthenticatedUser {
  id: string;
  email: string;
  role_id: number;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() means no role restriction.
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    const hasRequiredRole = requiredRoles.includes(user.role_id as Role);

    if (!hasRequiredRole) {
      throw new ForbiddenException("You are not allowed to perform this action");
    }

    return true;
  }
}
