import { UserManagementPermission } from "../../../auth/authorization/enum/user-management-permissions.enum";

export type UserManagementPermissions = Record<UserManagementPermission, boolean>;
