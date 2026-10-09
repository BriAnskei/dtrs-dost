import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { DocumentFileEntity } from "../../document-file/entities/document-file.entity";
import { IncomingDocumentStatusHistoryEntity } from "./incoming-document-status-history-entity";

export enum IncomingDocumentStatus {
  PENDING = "pending",
  ONGOING = "ongoing",
  COMPLETE = "complete",
}

@Entity("incoming_documents")
export class IncomingDocumentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  document_file_id!: string;

  @OneToOne(() => DocumentFileEntity, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "document_file_id" })
  document_file!: DocumentFileEntity;

  @Column({ type: "text" })
  subject!: string;

  @Column({ type: "text", nullable: true })
  sender!: string | null;

  @Column({ type: "text", nullable: true })
  recipient!: string | null;

  @Column({ type: "date", nullable: true })
  date_received!: Date | null;

  @Column({ type: "text", nullable: true })
  summary!: string | null;

  @Column({
    type: "enum",
    enum: IncomingDocumentStatus,
    enumName: "incoming_document_status",
    default: IncomingDocumentStatus.PENDING,
  })
  status!: IncomingDocumentStatus;

  @OneToMany(
    () => IncomingDocumentStatusHistoryEntity,
    (history) => history.incoming_document,
  )
  status_histories!: IncomingDocumentStatusHistoryEntity[];

  @UpdateDateColumn({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  updated_at!: Date;
}
