import type { UserManagementPermissions } from "../../features/auth/authorization/types/user-management-permission.type";

export type User = {
  id: string;
  division_id: string | null;
  full_name: string;
  role_id: Roles;
  email: string;
  contact_number: string | null;
  position: string | null;
  is_active: boolean;
  permissions: {
    user_management_permissions: UserManagementPermissions | null;
  };
};

export type Roles = 1 | 2 | 3 | 4;

export type RoleName = "super_admin" | "admin" | "receiver_officer" | "division";
