export class DivisionWithUsersResponseDto {
  id!: string;
  division_name!: string;

  users!: {
    full_name: string;
    email: string;
    is_active: boolean;
  }[];
}
