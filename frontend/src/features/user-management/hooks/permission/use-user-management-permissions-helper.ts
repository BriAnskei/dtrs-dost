import { useMemo } from "react";
import { UserManagementPermissionEnum as P } from "../../../auth/authorization/enum/user-management-permission";
import { usePermissions } from "../../../auth/authorization/hooks/use-permissions";

export function useUserManagementPermissionsHelper() {
  const { can, canAny } = usePermissions("user_management_permissions");
  return useMemo(
    () => ({
      canView: can(P.View),
      canAdd: can(P.Add),
      canEdit: can(P.Edit),
      canResetPassword: can(P.ResetPassword),
      canDisable: can(P.Disable),
      canReactivate: can(P.Reactivate),
      hasAnyRowAction: canAny(P.Edit, P.ResetPassword, P.Disable),
      canDelete: can(P.Delete),

      hasAnyDisabledRowAction: canAny(P.Reactivate, P.Delete),
    }),
    [can, canAny],
  );
}
