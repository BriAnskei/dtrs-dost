import type { ReactNode } from "react";
import { usePermissions } from "./hooks/use-permissions";
import type { PermissionModuleKey, PermissionOf } from "./types/permission-module.type";

interface CanProps<K extends PermissionModuleKey> {
  module: K;
  permission: PermissionOf<K>;
  children: ReactNode;
  /** Rendered when not allowed. Defaults to nothing (hidden). */
  fallback?: ReactNode;
}

export function Can<K extends PermissionModuleKey>({
  module,
  permission,
  children,
  fallback = null,
}: CanProps<K>) {
  const { can } = usePermissions(module);
  return <>{can(permission) ? children : fallback}</>;
}
