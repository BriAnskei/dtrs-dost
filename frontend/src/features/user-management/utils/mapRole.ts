import type { UserRole } from "../type/user.type";

/**
 * Maps the raw role string returned by the API (e.g. "super_admin")
 * to the display-friendly UserRole used across the UI.
 *
 * Single responsibility: role-name translation only. Nothing else.
 */
const API_ROLE_TO_DISPLAY_ROLE: Record<string, UserRole> = {
  super_admin: "Super Admin",
  admin: "Admin",
  receiver_officer: "Receiver",
  division: "Division",
};

const FALLBACK_ROLE: UserRole = "Admin";

export function mapApiRoleToDisplayRole(apiRole: string): UserRole {
  return API_ROLE_TO_DISPLAY_ROLE[apiRole] ?? FALLBACK_ROLE;
}
