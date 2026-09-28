export class ManagementPermissionsResponseDto {
  add!: boolean;
  edit!: boolean;
  reset_password!: boolean;
  deactivate!: boolean;
  reactivate!: boolean;
  delete!: boolean;
}

export class UserPermissionResponseTo<T> {
  user_id!: string;
  full_name!: string;
  email!: string;

  data!: T | null;
}
