export interface ManagementPermissions {
  add: boolean;
  edit: boolean;
  reset_password: boolean;
  deactivate: boolean;
  reactivate: boolean;
  delete: boolean;
}

export interface UserPermissionResponse<T> {
  user_id: string;
  full_name: string;
  email: string;
  data: T | null;
}

export interface FindUserManagementPermissionsParams {
  limit?: number;
  name?: string;
  cursor?: string;
}

export type UserManagementPermission = UserPermissionResponse<ManagementPermissions>;

export const MANAGEMENT_PERMISSION_FIELDS = [
  "add",
  "edit",
  "reset_password",
  "deactivate",
  "reactivate",
  "delete",
] as const satisfies readonly (keyof ManagementPermissions)[];

export type ManagementPermissionField = (typeof MANAGEMENT_PERMISSION_FIELDS)[number];
