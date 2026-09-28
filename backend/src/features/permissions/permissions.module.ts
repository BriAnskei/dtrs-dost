import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserPermissionController } from "./controller/user-permission.controller";
import { UserManagementPermissionsEntity } from "./entities/user-management-permissions-entity";
import { UserPermissionsEntity } from "./entities/user-permissions-entity";
import { UserManagementPermissionRepository } from "./repository/user-management-permission.repository";
import { UserPermissionsRepository } from "./repository/user-permissions.repository";
import { UserPermissionService } from "./service/user-permission.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPermissionsEntity, UserManagementPermissionsEntity]),
  ],
  controllers: [UserPermissionController],
  providers: [
    UserPermissionService,
    UserPermissionsRepository,
    UserManagementPermissionRepository,
  ],
  exports: [UserPermissionsRepository, UserManagementPermissionRepository],
})
export class PermissionsModule {}
