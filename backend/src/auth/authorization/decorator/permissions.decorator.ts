import { SetMetadata } from "@nestjs/common";
import { UserManagementPermission } from "../enum/user-management-permissions.enum";

export const PERMISSION_KEY = "permission";

export const RequirePermission = (permission: UserManagementPermission) =>
  SetMetadata(PERMISSION_KEY, permission);
