import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { UserEntity } from "../../../user/entities/user.entity";
import {
  IncomingDocumentEntity,
  IncomingDocumentStatus,
} from "./incoming-document-entity";

@Entity("incoming_document_status_histories")
export class IncomingDocumentStatusHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  incoming_document_id!: string;

  @ManyToOne(
    () => IncomingDocumentEntity,
    (incomingDocument) => incomingDocument.status_histories,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({ name: "incoming_document_id" })
  incoming_document!: IncomingDocumentEntity;

  @Column({
    type: "enum",
    enum: IncomingDocumentStatus,
    enumName: "incoming_document_status",
  })
  status!: IncomingDocumentStatus;

  @Column({ type: "text", nullable: true })
  remarks!: string | null;

  @Column({ type: "uuid", nullable: true })
  changed_by!: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "changed_by" })
  changed_by_user!: UserEntity | null;

  @CreateDateColumn({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at!: Date;
}
