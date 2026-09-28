import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PermissionsGuard } from "./guard/permission.guard";
import { RolesGuard } from "./guard/roles.guard";

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AuthorizationModule {}
