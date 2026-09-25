export interface UserWithRelationResponse {
  id: string;
  full_name: string;
  position?: string;
  email: string;
  division_name?: string;
  role: string;
  contact?: string;
  created_at: string;
  deactivated_at?: string;
}

export type UserRole = "Super Admin" | "Admin" | "Receiver" | "Division";
export type AccountStatus = "Active" | "Disabled";

/**
 * View-model shape consumed by the table/UI. Decoupled from the raw API
 * response — `mapUserResponseToSystemUser` is the only place that knows
 * how to build one of these from `UserWithRelationResponse`.
 */
export interface SystemUser {
  contact: string;
  id: string;
  name: string;
  position: string;
  divisionName?: string;
  role: UserRole;
  email: string;
  createtAt: string;
  deactivatedAt?: string;
}

export interface UserManagementTableProps {
  /** Max height of the scrollable desktop table body (CSS value, e.g. "560px" or "70vh"). */
  maxTableHeight?: string;
  /** Max height of the scrollable mobile card list (CSS value). */
  maxMobileHeight?: string;
}

/** Shown when the API doesn't provide a value for an optional field. */
export const NO_VALUE_PLACEHOLDER = "—";

export type SortDirection = "newest" | "oldest";

export interface FindUsersParams {
  limit?: number;
  name?: string;
  role_id?: number;
  sort?: SortDirection;
  cursor?: string;
}
