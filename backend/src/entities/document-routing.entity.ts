import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Division } from './division.entity';
import { IncomingDocuments } from './incoming-documents.entity';

@Entity('document_routing')
export class DocumentRouting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => IncomingDocuments)
  @JoinColumn({ name: 'incoming_document_id' })
  incomingDocument: IncomingDocuments;

  @Column({ type: 'uuid', name: 'incoming_document_id' })
  incomingDocumentId: string;

  @ManyToOne(() => Division)
  @JoinColumn({ name: 'division_id' })
  division: Division;

  @Column({ type: 'uuid', name: 'division_id' })
  divisionId: string;
}
