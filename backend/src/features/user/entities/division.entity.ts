import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { IncomingDocumentAssignmentEntity } from "../../document/incoming/entities/incoming-document-assignment.entity";
import { UserEntity } from "./user.entity";

@Entity("divisions")
@Unique("uq_divisions_name", ["division_name"])
export class DivisionEntity {
  @PrimaryGeneratedColumn("uuid")
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

  @OneToMany(
    () => IncomingDocumentAssignmentEntity,
    (assignment) => assignment.division,
  )
  IncomingDocumentAssignments!: IncomingDocumentAssignmentEntity[];
}
