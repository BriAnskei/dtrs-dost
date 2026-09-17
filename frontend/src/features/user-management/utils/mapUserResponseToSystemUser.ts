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
    title: user.position ?? NO_VALUE_PLACEHOLDER,
    role: mapApiRoleToDisplayRole(user.role),
    email: user.email,
    division: user.division,
    status: user.is_active ? "Active" : "Disabled",
  };
}

export function mapUsersResponseToSystemUsers(
  users: UserWithRelationResponse[],
): SystemUser[] {
  return users.map(mapUserResponseToSystemUser);
}
