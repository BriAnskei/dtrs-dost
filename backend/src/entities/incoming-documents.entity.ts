import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { IncomingDocumentFile } from './incoming-document-file.entity';
import { DocumentRouting } from './document-routing.entity';

@Entity('incoming_documents')
export class IncomingDocuments {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @ManyToOne(() => IncomingDocumentFile)
  @JoinColumn({ name: 'document_file_id' })
  documentFile: IncomingDocumentFile;

  @Column({ type: 'uuid', name: 'document_file_id' })
  documentFileId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'ongoing', 'complete'],
    default: 'pending',
  })
  status: 'pending' | 'ongoing' | 'complete';

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'unique_id' })
  uniqueId: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'from' })
  from: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'to' })
  to: string | null;

  @Column({ type: 'date', nullable: true, name: 'date_received' })
  dateReceived: string | null;

  @Column({ type: 'text', nullable: true, name: 'notice_action' })
  noticeAction: string | null;

  @Column({ type: 'text', nullable: true, name: 'action_taken' })
  actionTaken: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @OneToMany(() => DocumentRouting, (routing) => routing.incomingDocument)
  documentRouting: DocumentRouting[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
