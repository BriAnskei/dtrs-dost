import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('divisions')
export class Division {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({
    name: 'division_name',
    type: 'varchar',
    length: 255,
  })
  division_name: string;
}
