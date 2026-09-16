import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "../../user/entities/user.entity";

@Entity("roles")
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ type: "varchar", length: 50 })
  name!: string;

  @OneToMany(
    () => UserEntity,
    (user) => user.role,
  )
  users!: UserEntity[];
}
