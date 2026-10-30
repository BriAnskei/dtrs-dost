import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DivisionEntity } from "../../../user/entities/division.entity";
import { UserEntity } from "../../../user/entities/user.entity";
import { AssignmentStatus } from "../enums/assignment-status.enum";
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
@Check(
  "chk_ida_status_action_taken",
  `(
    (
      "status" IN ('PENDING', 'ONGOING')
      AND "action_taken" IS NULL
      AND "action_taken_at" IS NULL
      AND "action_taken_by_id" IS NULL
    )
    OR
    (
      "status" = 'COMPLETE'
      AND "action_taken" IS NOT NULL
      AND "action_taken_at" IS NOT NULL
      AND "action_taken_by_id" IS NOT NULL
    )
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

  @Column({ type: "text" })
  notice_of_action!: string;

  @Column({ type: "text", nullable: true })
  notice_description!: string | null;

  @Column({ type: "uuid", nullable: true })
  created_by_id!: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  @JoinColumn({
    name: "created_by_id",
    foreignKeyConstraintName: "incoming_document_assignments_created_by_id_fkey",
  })
  created_by!: UserEntity | null;

  @Column({ type: "text", nullable: true })
  action_taken!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  action_taken_at!: Date | null;

  @Column({ type: "uuid", nullable: true })
  action_taken_by_id!: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  @JoinColumn({
    name: "action_taken_by_id",
    foreignKeyConstraintName: "incoming_document_assignments_action_taken_by_id_fkey",
  })
  action_taken_by!: UserEntity | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @Column({
    type: "enum",
    enum: AssignmentStatus,
    enumName: "assignment_status_enum",
    default: AssignmentStatus.ONGOING,
  })
  status!: AssignmentStatus;
}
