export interface GrantUserManagementPermissionDto {
  add: boolean;
  edit: boolean;
  reset_password: boolean;
  disable: boolean;
  reactivate: boolean;
  delete: boolean;
}
