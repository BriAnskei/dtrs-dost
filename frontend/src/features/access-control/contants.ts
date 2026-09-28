import type { UserManagementPermission } from "./types/access-controll-types";
import { MANAGEMENT_PERMISSION_FIELDS } from "./types/user-management-permission-types";

/**
 * UI-only metadata (label, description, risk) for each permission the
 * access table renders. The set of keys is derived from
 * MANAGEMENT_PERMISSION_FIELDS (the server's actual DTO fields) so this
 * can never drift out of sync with the API.
 *
 * Only the copy (label/description/risk) is maintained here.
 */
const PERMISSION_META: Record<
  (typeof MANAGEMENT_PERMISSION_FIELDS)[number],
  {
    label: string;
    description: string;
    risk: "low" | "high";
  }
> = {
  add: {
    label: "Add users",
    description: "Create new user accounts.",
    risk: "low",
  },
  edit: {
    label: "Edit users",
    description: "Update an existing user's details.",
    risk: "low",
  },
  reset_password: {
    label: "Reset password",
    description: "Reset a user's password on their behalf.",
    risk: "low",
  },
  deactivate: {
    label: "Deactivate users",
    description: "Suspend a user's access to the system.",
    risk: "high",
  },
  reactivate: {
    label: "Reactivate users",
    description: "Restore access for a previously deactivated user.",
    risk: "low",
  },
  delete: {
    label: "Delete users",
    description: "Permanently remove a user account.",
    risk: "high",
  },
};

export const USER_MANAGEMENT_PERMISSIONS: UserManagementPermission[] = [
  {
    key: "user_management.access",
    label: "Access User Management",
    description: "Lets this admin open the User Management page at all.",
    risk: "low",
  },
  ...MANAGEMENT_PERMISSION_FIELDS.map((field) => ({
    key: `user_management.${field}`,
    ...PERMISSION_META[field],
    ...(field === "reactivate" || field === "delete"
      ? { dependsOn: "user_management.deactivate" }
      : {}),
  })),
];
