import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('incoming_document_files')
export class IncomingDocumentFile {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid', name: 'uploader_id' })
  uploaderId: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 1024 })
  path: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
