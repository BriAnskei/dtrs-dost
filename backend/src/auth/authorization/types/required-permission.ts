import { PermissionDomain } from "../enum/permission-domain.enum";

export interface RequiredPermission {
  domain: PermissionDomain;
  permission: string;
}
