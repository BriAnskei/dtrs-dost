import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  description?: string;
}
