import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PasswordResetTokenEntity } from "../../auth/authentication/entities/password-reset-token.entity";
import { DivisionEntity } from "./division.entity";
import { RoleEntity } from "./role.entity";

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: true })
  division_id!: string | null;

  @ManyToOne(
    () => DivisionEntity,
    (division) => division.users,
    {
      nullable: true,
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({ name: "division_id" })
  division!: DivisionEntity | null;

  @Column({ type: "int" })
  role_id!: string;

  @ManyToOne(
    () => RoleEntity,
    (role) => role.users,
    {
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({ name: "role_id" })
  role!: RoleEntity;

  @Column({ type: "varchar", length: 255 })
  full_name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  position!: string | null;

  @Column({ type: "varchar", length: 255 })
  password!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  contact_number!: string | null;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "bool", default: true })
  is_active!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  deactivated_at!: Date | null;

  @CreateDateColumn({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at!: Date;

  @OneToOne(
    () => PasswordResetTokenEntity,
    (passwordResetToken) => passwordResetToken.user,
  )
  password_reset_token!: PasswordResetTokenEntity | null;
}
