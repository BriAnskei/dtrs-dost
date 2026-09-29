import type { User } from "../../../../context/currentUser/curr-user.type";

export type PermissionModuleKey = keyof User["permissions"];

export type ModulePermissions<K extends PermissionModuleKey> = NonNullable<
  User["permissions"][K]
>;

export type PermissionOf<K extends PermissionModuleKey> = keyof ModulePermissions<K>;
