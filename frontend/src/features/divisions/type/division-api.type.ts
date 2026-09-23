export interface DivisionUserResponse {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface DivisionResponse {
  id: string;
  division_name: string;
  users: DivisionUserResponse[];
}

export interface FindDivisionsResponse {
  data: DivisionResponse[];
  nextCursor: string | null;
}

export type DivisionSort = "name_asc" | "most_users";

export interface FindDivisionsParams {
  search?: string;
  sort?: DivisionSort;
  limit?: number;
  cursor?: string;
}
