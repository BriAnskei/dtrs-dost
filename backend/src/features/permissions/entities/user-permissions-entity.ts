import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "../../user/entities/user.entity";
import { UserManagementPermissionsEntity } from "./user-management-permissions-entity";

@Entity("user_permissions")
export class UserPermissionsEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", unique: true })
  user_id!: string;

  @OneToOne(
    () => UserEntity,
    (user) => user.user_permissions,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @OneToOne(
    () => UserManagementPermissionsEntity,
    (managementPermissions) => managementPermissions.userPermission,
  )
  managementPermissions?: UserManagementPermissionsEntity;
}
