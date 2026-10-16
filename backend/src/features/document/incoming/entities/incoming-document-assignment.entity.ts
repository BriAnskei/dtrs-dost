import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DivisionEntity } from "../../../user/entities/division.entity";
import { IncomingDocumentEntity } from "./incoming-document-entity";

export enum OfficeType {
  MAIN = "MAIN",
  DIVISION = "DIVISION",
}

@Entity("incoming_document_assignments")
@Check(
  "chk_ida_office_division",
  `(
    ("office_type" = 'MAIN' AND "division_id" IS NULL)
    OR
    ("office_type" = 'DIVISION' AND "division_id" IS NOT NULL)
  )`,
)
@Index("idx_ida_incoming_document_id", ["incoming_document_id"])
@Index("idx_ida_division_id", ["division_id"])
export class IncomingDocumentAssignmentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  incoming_document_id!: string;

  @ManyToOne(
    () => IncomingDocumentEntity,
    (document) => document.assignments,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({
    name: "incoming_document_id",
    foreignKeyConstraintName: "fk_ida_incoming_document",
  })
  incoming_document!: IncomingDocumentEntity;

  @Column({
    type: "enum",
    enum: OfficeType,
    enumName: "office_type_enum",
  })
  office_type!: OfficeType;

  @Column({ type: "uuid", nullable: true })
  division_id!: string | null;

  @ManyToOne(() => DivisionEntity, {
    nullable: true,
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn({
    name: "division_id",
    foreignKeyConstraintName: "fk_ida_division",
  })
  division!: DivisionEntity | null;

  @Column({ type: "text", nullable: true })
  notice_of_action!: string | null;

  @Column({ type: "text", nullable: true })
  action_taken!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  action_taken_at!: Date | null;
}
