// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "Super Admin" | "Admin" | "Receiver" | "Division";
export type AccountStatus = "Active" | "Disabled";

export interface SystemUser {
  id: number;
  name: string;
  title: string;
  role: UserRole;
  email: string;
  contact: string;
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
  contact: string;
}

export const EMPTY_FORM: UserFormState = {
  name: "",
  title: "",
  role: "Admin",
  email: "",
  contact: "",
};
