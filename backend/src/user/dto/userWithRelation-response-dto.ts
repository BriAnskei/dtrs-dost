export class UserWithRelationResponseDto {
  id!: string;
  full_name!: string;
  position!: string | null;
  contact!: string;
  role!: string;
  division_name?: string;
  email!: string;
  created_at!: Date;
}
