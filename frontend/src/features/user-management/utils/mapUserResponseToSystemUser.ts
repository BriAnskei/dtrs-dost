import {
  NO_VALUE_PLACEHOLDER,
  type SystemUser,
  type UserWithRelationResponse,
} from "../type/user.type";
import { mapApiRoleToDisplayRole } from "./mapRole";

/**
 * Translates a single API user record into the view-model shape the
 * table/UI works with. This is the ONLY place that should know about
 * both `UserWithRelationResponse` and `SystemUser` at the same time.
 */
export function mapUserResponseToSystemUser(user: UserWithRelationResponse): SystemUser {
  return {
    id: user.id,
    name: user.full_name,
    position: user.position ?? NO_VALUE_PLACEHOLDER,
    role: mapApiRoleToDisplayRole(user.role),
    email: user.email,
    contact: user.contact ?? NO_VALUE_PLACEHOLDER,
    divisionName: user.division_name,
    createtAt: new Date(user.created_at).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}

export function mapUsersResponseToSystemUsers(
  users: UserWithRelationResponse[],
): SystemUser[] {
  return users.map(mapUserResponseToSystemUser);
}
