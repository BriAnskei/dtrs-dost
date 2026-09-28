import { UserManagementPermissions } from "../../../features/permissions/type/user-management-permissions";
import { Role } from "../../authorization/enum/roles.enum";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role_id: Role;
  user_management_permissions: UserManagementPermissions | null;
}
