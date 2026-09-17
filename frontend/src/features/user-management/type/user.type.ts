export interface CreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  role_id: number;
  division: string;
  position?: string;
  contact_number?: string;
}

export interface UserWithRelationResponse {
  id: string;
  full_name: string;
  position?: string;
  email: string;
  role: string;
  is_active: boolean;
  division: string | null;
  created_at: string;
}

export type UserRole = "Super Admin" | "Admin" | "Receiver" | "Division";
export type AccountStatus = "Active" | "Disabled";

/**
 * View-model shape consumed by the table/UI. Decoupled from the raw API
 * response — `mapUserResponseToSystemUser` is the only place that knows
 * how to build one of these from `UserWithRelationResponse`.
 */
export interface SystemUser {
  id: string;
  name: string;
  title: string;
  role: UserRole;
  email: string;
  division: string | null;
  status: AccountStatus;
}

export interface UserManagementTableProps {
  /** Max height of the scrollable desktop table body (CSS value, e.g. "560px" or "70vh"). */
  maxTableHeight?: string;
  /** Max height of the scrollable mobile card list (CSS value). */
  maxMobileHeight?: string;
}

export interface UserFormState {
  name: string;
  title: string;
  role: UserRole;
  email: string;
  division: string | null;
}

export const EMPTY_FORM: UserFormState = {
  name: "",
  title: "",
  role: "Admin",
  email: "",
  division: null,
};

/** Shown when the API doesn't provide a value for an optional field. */
export const NO_VALUE_PLACEHOLDER = "—";
