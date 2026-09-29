import type { User } from "../../../../context/currentUser/curr-user.type";
import type { PermissionModuleKey, PermissionOf } from "../types/permission-module.type";
import { hasPermission } from "./has-permission";

const SUPER_ADMIN_ROLE_ID = 1;

export function hasModulePermission<K extends PermissionModuleKey>(
  user: User | null | undefined,
  moduleKey: K,
  permission: PermissionOf<K>,
): boolean {
  if (!user) return false;
  if (user.role_id === SUPER_ADMIN_ROLE_ID) return true; // bypass

  // The cast is confined to this one place; callers stay fully typed.
  return hasPermission(
    user.permissions[moduleKey] as Record<string, boolean> | null,
    permission as string,
  );
}

/**
 * Builds a (user) => boolean predicate for PermissionRoute and nav config.
 */
export const requirePermission =
  <K extends PermissionModuleKey>(moduleKey: K, permission: PermissionOf<K>) =>
  (user: User) =>
    hasModulePermission(user, moduleKey, permission);
