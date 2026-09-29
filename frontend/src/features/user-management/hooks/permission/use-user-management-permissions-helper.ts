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
      canDeactivate: can(P.Deactivate),
      canReactivate: can(P.Reactivate),
      hasAnyRowAction: canAny(P.Edit, P.ResetPassword, P.Deactivate),
      canDelete: can(P.Delete),

      hasAnyDeactivatedRowAction: canAny(P.Reactivate, P.Delete),
    }),
    [can, canAny],
  );
}
