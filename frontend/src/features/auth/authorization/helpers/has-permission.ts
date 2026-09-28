export function hasPermission<T extends Record<string, boolean>>(
  permissions: T | null,
  permission: keyof T,
): boolean {
  return permissions?.[permission] === true;
}
