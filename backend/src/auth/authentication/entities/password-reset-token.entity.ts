import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("password_reset_tokens")
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "varchar", unique: true })
  token_hash!: string;

  @Column({ type: "timestamptz" })
  expires_at!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
