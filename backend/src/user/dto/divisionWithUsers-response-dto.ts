export interface DivisionUserResponseDto {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface DivisionResponseDto {
  id: string;
  division_name: string;
  users: DivisionUserResponseDto[];
}
