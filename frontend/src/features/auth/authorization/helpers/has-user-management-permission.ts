import type { User } from "../../../../context/currentUser/curr-user.type";
import type { UserManagementPermissionEnum } from "../enum/user-management-permission";
import { hasPermission } from "./has-permission";

export function hasUserManagementPermission(
  user: User,
  permission: UserManagementPermissionEnum,
): boolean {
  if (user.role_id === 1) return true;

  return hasPermission(user.permissions.user_management_permissions, permission);
}
