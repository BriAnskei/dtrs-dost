export class UserManagementPermissionsResponseDto {
  add!: boolean;
  edit!: boolean;
  reset_password!: boolean;
  deactivate!: boolean;
  reactivate!: boolean;
  delete!: boolean;
}

export class CurrentUserResponseDto {
  id!: string;
  division_id!: string | null;
  full_name!: string;
  role_id!: string;
  email!: string;
  contact_number!: string | null;
  position!: string | null;
  is_active!: boolean;
  user_management_permissions!: UserManagementPermissionsResponseDto | null;
}
