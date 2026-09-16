import { Column, Entity, OneToMany, PrimaryColumn, Unique } from "typeorm";
import { UserEntity } from "../../user/entities/user.entity";

@Entity("divisions")
@Unique("uq_divisions_name", ["division_name"])
export class DivisionEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({
    name: "division_name",
    type: "varchar",
    length: 255,
  })
  division_name!: string;

  @OneToMany(
    () => UserEntity,
    (user) => user.division,
  )
  users!: UserEntity[];
}
