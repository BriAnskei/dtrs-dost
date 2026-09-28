export type User = {
  id: string;
  division_id: string | null;
  full_name: string;
  role_id: Roles;
  email: string;
  contact_number: string | null;
  position: string | null;
  is_active: boolean;
  user_management_permissions: UserManagementPermissions | null;
};

export type UserManagementPermissions = {
  add: boolean;
  edit: boolean;
  reset_password: boolean;
  deactivate: boolean;
  reactivate: boolean;
  delete: boolean;
};

export type Roles = 1 | 2 | 3 | 4;

export type RoleName = "super_admin" | "admin" | "receiver_officer" | "division";
