import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DocumentFileEntity } from "../../extraction/entities/document-files.entity";
import type { Decision } from "../extration-queue.constant";
import { DECISION_VALUES } from "../extration-queue.constant";

@Entity("extracted_document_queues")
export class ExtractedDocumentQueueEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  document_file_id!: string;

  @OneToOne(() => DocumentFileEntity, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "document_file_id" })
  document_file!: DocumentFileEntity;

  @Column({ type: "jsonb" })
  extracted_data!: Record<string, unknown>;

  @Column({
    type: "enum",
    enum: DECISION_VALUES,
    enumName: "extracted_document_queue_decision_enum",
  })
  decision!: Decision;

  @CreateDateColumn({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at!: Date;
}
