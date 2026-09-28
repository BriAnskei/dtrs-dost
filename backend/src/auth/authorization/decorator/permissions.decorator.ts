import { SetMetadata } from "@nestjs/common";
import { PermissionDomain } from "../enum/permission-domain.enum";

export const PERMISSION_KEY = "permission";

export const RequirePermission = (domain: PermissionDomain, permission: string) =>
  SetMetadata(PERMISSION_KEY, {
    domain,
    permission,
  });
