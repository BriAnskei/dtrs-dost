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
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ type: "uuid", unique: true })
  document_file_id!: string;

  @OneToOne(() => DocumentFileEntity, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "document_file_id" })
  document_file!: DocumentFileEntity;

  @Column({ type: "varchar", length: 500 })
  subject!: string;

  @Column({ name: "to", type: "varchar", length: 255 })
  to!: string;

  @Column({ type: "date", nullable: true })
  date_prepared!: string | null;

  @Column({ type: "date", nullable: true })
  date_received!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  received_by!: string | null;
}
