import {
  NO_VALUE_PLACEHOLDER,
  type SystemUser,
  type UserWithRelationResponse,
} from "../type/user.type";
import { mapApiRoleToDisplayRole } from "./mapRole";

function normalizeDivision(division: unknown): string | null {
  if (division == null) return null;
  if (typeof division === "string") return division;
  if (typeof division === "object") {
    const obj = division as { division_name?: string; name?: string };
    return obj.division_name ?? obj.name ?? null;
  }
  return null;
}

function normalizeRole(role: unknown): string {
  if (typeof role === "string") return role;
  if (typeof role === "object" && role !== null) {
    const obj = role as { name?: string };
    return obj.name ?? JSON.stringify(role);
  }
  return String(role);
}

/**
 * Translates a single API user record into the view-model shape the
 * table/UI works with. This is the ONLY place that should know about
 * both `UserWithRelationResponse` and `SystemUser` at the same time.
 */
export function mapUserResponseToSystemUser(user: UserWithRelationResponse): SystemUser {
  return {
    id: user.id,
    name: user.full_name,
    title: user.position ?? NO_VALUE_PLACEHOLDER,
    role: mapApiRoleToDisplayRole(normalizeRole(user.role)),
    email: user.email,
    division: normalizeDivision(user.division),
    contact: user.contact,
    status: user.is_active ? "Active" : "Disabled",
  };
}

export function mapUsersResponseToSystemUsers(
  users: UserWithRelationResponse[],
): SystemUser[] {
  return users.map(mapUserResponseToSystemUser);
}
