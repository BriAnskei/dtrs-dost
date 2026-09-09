import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IncomingDocumentFile } from './incoming-document-file.entity';

@Entity('invalid_documents')
export class InvalidDocument {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @ManyToOne(() => IncomingDocumentFile)
  @JoinColumn({ name: 'document_file_id' })
  documentFile: IncomingDocumentFile;

  @Column({ type: 'uuid', name: 'document_file_id' })
  documentFileId: string;

  @Column({ type: 'text', nullable: true })
  missingFields: string | null;

  @Column({ type: 'text', nullable: true })
  aiResponse: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_mark_invalid' })
  isMarkInvalid: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
