export class UserWithRelationResponseDto {
  id!: string;
  full_name!: string;
  position!: string | null;
  contact!: string;
  role!: string;
  email!: string;
  created_at!: Date;
}
