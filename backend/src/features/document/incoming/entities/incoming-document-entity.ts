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
import { IncomingDocumentAssignmentEntity } from "./incoming-document-assignment.entity";
import { IncomingDocumentRoutingEntity } from "./incoming-document-routing.entity";
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

  @Column({
    type: "uuid",
    unique: true,
    nullable: false,
  })
  document_file_id!: string;

  @OneToOne(() => DocumentFileEntity, {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({
    name: "document_file_id",
    foreignKeyConstraintName: "fk_incoming_documents_document_file",
  })
  document_file!: DocumentFileEntity;

  @Column({
    type: "text",
    nullable: false,
  })
  subject!: string;

  @Column({
    type: "text",
    nullable: false,
  })
  document_from!: string;

  @Column({
    type: "text",
    name: "to",
    nullable: false,
  })
  recipient!: string;

  @Column({
    type: "date",
    nullable: false,
  })
  date_received!: string;

  @Column({
    type: "enum",
    enum: IncomingDocumentStatus,
    enumName: "incoming_document_status",
    default: IncomingDocumentStatus.PENDING,
    nullable: false,
  })
  status!: IncomingDocumentStatus;

  @Column({
    type: "text",
    nullable: false,
  })
  summary!: string;

  @UpdateDateColumn({
    type: "timestamptz",
    default: () => "now()",
    nullable: false,
  })
  updated_at!: Date;

  @OneToMany(
    () => IncomingDocumentStatusHistoryEntity,
    (history) => history.incoming_document,
  )
  status_histories!: IncomingDocumentStatusHistoryEntity[];

  @OneToMany(
    () => IncomingDocumentRoutingEntity,
    (routing) => routing.incoming_document,
  )
  routings!: IncomingDocumentRoutingEntity[];

  @OneToMany(
    () => IncomingDocumentAssignmentEntity,
    (assignment) => assignment.incoming_document,
  )
  assignments!: IncomingDocumentAssignmentEntity[];
}
