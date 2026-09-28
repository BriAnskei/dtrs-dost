import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticatedRequest } from "../../authentication/types/authenticated-request";
import { PERMISSION_KEY } from "../decorator/permissions.decorator";
import { Role } from "../enum/roles.enum";
import { UserManagementPermission } from "../enum/user-management-permissions.enum";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<UserManagementPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Endpoint doesn't require a permission.
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (user.role_id === Role.SuperAdmin) {
      return true;
    }

    const permissions = user.user_management_permissions;

    if (!permissions) {
      throw new ForbiddenException("You do not have access to user management");
    }

    if (!permissions[requiredPermission]) {
      throw new ForbiddenException("You do not have permission to perform this action");
    }

    return true;
  }
}
