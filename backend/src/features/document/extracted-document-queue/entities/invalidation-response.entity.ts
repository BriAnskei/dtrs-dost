import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ExtractedDocumentQueueEntity } from "./extracted-document-queue.entity";

@Entity("invalidation_responses")
export class InvalidationResponseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  extracted_document_queue_id!: string;

  @ManyToOne(() => ExtractedDocumentQueueEntity, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "extracted_document_queue_id" })
  extracted_document_queue!: ExtractedDocumentQueueEntity;

  @Column({ type: "text" })
  response!: string;

  @CreateDateColumn({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at!: Date;
}
