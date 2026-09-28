export interface GrantUserManagementPermissionDto {
  add: boolean;
  edit: boolean;
  reset_password: boolean;
  deactivate: boolean;
  reactivate: boolean;
  delete: boolean;
}
