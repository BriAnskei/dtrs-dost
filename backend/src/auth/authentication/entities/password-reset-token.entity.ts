import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { UserEntity } from "../../../user/entities/user.entity";

@Entity("password_reset_tokens")
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", unique: true })
  user_id!: string;

  @OneToOne(
    () => UserEntity,
    (user) => user.password_reset_token,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      nullable: false,
    },
  )
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @Column({ type: "varchar", unique: true })
  token_hash!: string;

  @Column({ type: "timestamptz" })
  expires_at!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
