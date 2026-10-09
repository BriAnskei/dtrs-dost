import { formatDate } from "@/utils/dateFormatter";
import {
  NO_VALUE_PLACEHOLDER,
  type SystemUser,
  type UserWithRelationResponse,
} from "../types/user.type";
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
    createtAt: formatDate(user.created_at),
    ...(user.deactivated_at && {
      deactivatedAt: formatDate(user.deactivated_at),
    }),
  };
}

export function mapUsersResponseToSystemUsers(
  users: UserWithRelationResponse[],
): SystemUser[] {
  return users.map(mapUserResponseToSystemUser);
}
