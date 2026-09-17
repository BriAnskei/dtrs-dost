export class UserWithRelationResponseDto {
  id!: string;
  full_name!: string;
  position!: string | null;
  email!: string;
  role!: string;
  is_active!: boolean;
  division!: string | null;
  created_at!: Date;
}
