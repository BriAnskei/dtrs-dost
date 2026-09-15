export type User = {
  id: string;
  division_id: string | null;
  full_name: string;
  role_id: Roles;
  email: string;
  contect_number: string | null;
  is_active: boolean;
};

export type Roles = 1 | 2 | 3 | 4; // super_admin, admin, receiver_officer, division

export type RoleName = "super_admin" | "admin" | "receiver_officer" | "division";
