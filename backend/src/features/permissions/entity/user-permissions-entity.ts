import { Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserManagementPermissionsEntity } from "./user-management-permissions-entity";

@Entity("user_permissions")
export class UserPermissionsEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne(
    () => UserManagementPermissionsEntity,
    (managementPermissions) => managementPermissions.userPermission,
    { cascade: true },
  )
  managementPermissions!: UserManagementPermissionsEntity;
}
