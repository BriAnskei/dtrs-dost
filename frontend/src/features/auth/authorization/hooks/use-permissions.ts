import { useMemo } from "react";
import { useUser } from "../../../../context/currentUser/use-user";
import { hasModulePermission } from "../helpers/has-module-permission";
import type { PermissionModuleKey, PermissionOf } from "../types/permission-module.type";

export function usePermissions<K extends PermissionModuleKey>(moduleKey: K) {
  const { currentUser } = useUser();

  return useMemo(() => {
    const can = (permission: PermissionOf<K>) =>
      hasModulePermission(currentUser, moduleKey, permission);

    return {
      can,
      /** True if the user has at least one of the permissions */
      canAny: (...permissions: PermissionOf<K>[]) => permissions.some(can),
      /** True only if the user has all of the permissions */
      canAll: (...permissions: PermissionOf<K>[]) => permissions.every(can),
    };
  }, [currentUser, moduleKey]);
}
