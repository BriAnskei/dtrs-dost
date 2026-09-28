import type { AdminAccount, AdminPermissions } from "../types/access-controll-types";
import type { GrantUserManagementPermissionDto } from "../types/grant-user-permission-dto";
import {
  MANAGEMENT_PERMISSION_FIELDS,
  type UserManagementPermission,
} from "../types/user-management-permission-types";

const MASTER_KEY = "user_management.access";

function toUiKey(field: (typeof MANAGEMENT_PERMISSION_FIELDS)[number]) {
  return `user_management.${field}`;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Translates the API's nested `data` into the UI's flat permission map.
 * `data === null` → master toggle off, every function toggle off.
 * `data` present → master toggle on, each function mirrors its API boolean.
 */
export function mapUserPermissionToAdminPermissions(
  permission: UserManagementPermission,
): AdminPermissions {
  const { data } = permission;

  return MANAGEMENT_PERMISSION_FIELDS.reduce(
    (acc, field) => {
      acc[toUiKey(field)] = data ? Boolean(data[field]) : false;
      return acc;
    },
    { [MASTER_KEY]: Boolean(data) } as AdminPermissions,
  );
}

export function mapUserPermissionToAdminAccount(
  permission: UserManagementPermission,
): AdminAccount {
  return {
    id: permission.user_id,
    name: permission.full_name,
    email: permission.email,
    avatar: getInitials(permission.full_name),
  };
}

/**
 * Diffs a row's draft against its last-saved values and builds the
 * partial DTO to PUT — only the function permissions that actually
 * changed, keyed by the API's field names (no "user_management."
 * prefix). The master toggle has no DTO field of its own — switching
 * it off is handled separately via revoke (see the hook).
 */
export function mapAdminPermissionsToGrantDto(
  draft: AdminPermissions,
  savedValues: AdminPermissions,
): Partial<GrantUserManagementPermissionDto> {
  const dto: Partial<GrantUserManagementPermissionDto> = {};

  MANAGEMENT_PERMISSION_FIELDS.forEach((field) => {
    const uiKey = toUiKey(field);
    if (draft[uiKey] !== savedValues[uiKey]) {
      dto[field] = draft[uiKey];
    }
  });

  return dto;
}
