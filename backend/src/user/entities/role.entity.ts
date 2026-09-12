import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  name!: string;
}
