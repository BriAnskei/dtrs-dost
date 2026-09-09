import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IncomingDocumentFile } from './incoming-document-file.entity';

@Entity('incoming_doc_queue')
export class IncomingDocQueue {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @ManyToOne(() => IncomingDocumentFile)
  @JoinColumn({ name: 'document_file_id' })
  documentFile: IncomingDocumentFile;

  @Column({ type: 'uuid', name: 'document_file_id' })
  documentFileId: string;

  @Column({
    type: 'enum',
    enum: ['on_queue', 'received'],
    default: 'on_queue',
  })
  status: 'on_queue' | 'received';

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
