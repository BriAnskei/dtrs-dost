export type PermissionRisk = "low" | "high";

export interface UserManagementPermission {
  key: string;
  label: string;
  description: string;
  risk: PermissionRisk;

  dependsOn?: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export type AdminPermissions = Record<string, boolean>;
