import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { UserPermissionsEntity } from "./user-permissions-entity";

@Entity("user_management_permissions")
export class UserManagementPermissionsEntity {
  @PrimaryColumn("uuid", { name: "user_permission_id" })
  userPermissionId!: string;

  @OneToOne(
    () => UserPermissionsEntity,
    (userPermission) => userPermission.managementPermissions,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "user_permission_id" })
  userPermission!: UserPermissionsEntity;

  @Column({ default: false })
  add!: boolean;

  @Column({ default: false })
  edit!: boolean;

  @Column({ default: false })
  reset_password!: boolean;

  @Column({ default: false })
  deactivate!: boolean;

  @Column({ default: false })
  reactivate!: boolean;

  @Column({ default: false })
  delete!: boolean;
}
