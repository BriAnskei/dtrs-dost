import type { UserRole } from "./user.type";

export interface UserFormState {
  name: string;
  position: string; // -> position
  role: UserRole | "";
  division?: string;
  email: string;
  contact: string; // -> contact_number
  password?: string; // only required on "add"
}

export const EMPTY_FORM: UserFormState = {
  name: "",
  position: "",
  role: "",
  email: "",
  contact: "",
  password: "",
};

export type AssignableRole = Exclude<UserRole, "Super Admin">;

export const ROLE_ID_MAP: Record<AssignableRole, number> = {
  Admin: 2,
  Receiver: 3,
  Division: 4,
};

export interface CreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  role_id: string;
  division?: string;
  position?: string;
  contact_number?: string;
}
