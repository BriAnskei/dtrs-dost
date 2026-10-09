import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DocumentFileEntity } from "../../document-file/entities/document-file.entity";
import { ExtractedField } from "../../extraction/providers/llm-extractor.interface";
import type { Decision } from "../extration-queue.constant";
import { DECISION_VALUES } from "../extration-queue.constant";
import { ExtractedChunk } from "../types/extracted-types";

export enum ExtractedDocumentQueueStatus {
  PENDING = "pending",
  APPROVED = "approved",
  INVALIDATED = "invalidated",
}

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
  extracted_data!: ExtractedField[];

  @Column({ type: "jsonb" })
  extracted_chunks!: ExtractedChunk[];

  @Column({
    type: "enum",
    enum: DECISION_VALUES,
    enumName: "extracted_document_queue_decision_enum",
  })
  decision!: Decision;

  @Column({
    type: "enum",
    enum: ExtractedDocumentQueueStatus,
    enumName: "extracted_document_queue_status_enum",
    default: ExtractedDocumentQueueStatus.PENDING,
  })
  status!: ExtractedDocumentQueueStatus;

  @CreateDateColumn({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at!: Date;
}
