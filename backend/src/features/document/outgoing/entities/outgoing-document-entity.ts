import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DocumentFileEntity } from "../../document-file/entities/document-file.entity";

@Entity("outgoing_documents")
@Index("idx_outgoing_documents_date_received", ["date_received"])
@Index("idx_outgoing_documents_date_prepared", ["date_prepared"])
@Index("idx_outgoing_documents_to", ["to"])
@Index("idx_outgoing_documents_subject", ["subject"])
export class OutgoingDocumentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", unique: true, nullable: false })
  document_file_id!: string;

  @OneToOne(() => DocumentFileEntity, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "document_file_id" })
  document_file!: DocumentFileEntity;

  @Column({
    type: "bigint",
    default: () => "nextval('document_tracking_code_seq'::regclass)",
    nullable: false,
  })
  tracking_sequence!: string;

  @Column({ type: "varchar", length: 500, nullable: false })
  subject!: string;

  @Column({ name: "to", type: "varchar", length: 255, nullable: false })
  to!: string;

  @Column({ type: "text", nullable: false })
  summary!: string;

  @Column({ type: "date", nullable: false })
  date_prepared!: string;

  @Column({ type: "date", nullable: false })
  date_received!: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  received_by!: string;
}
