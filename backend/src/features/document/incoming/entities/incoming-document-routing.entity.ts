import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { DivisionEntity } from "../../../user/entities/division.entity";
import { IncomingDocumentEntity } from "./incoming-document-entity";
import { IncomingDocumentRoutingAssignmentCounterEntity } from "./incoming-document-routing-assignment-counter.entity";

@Entity("incoming_document_routings")
@Unique("uq_incoming_document_routing", ["incoming_document_id", "division_id"])
@Index("idx_idr_division_id", ["division_id"])
export class IncomingDocumentRoutingEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  incoming_document_id!: string;

  @ManyToOne(
    () => IncomingDocumentEntity,
    (document) => document.routings,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({
    name: "incoming_document_id",
    foreignKeyConstraintName: "fk_idr_incoming_document",
  })
  incoming_document!: IncomingDocumentEntity;

  @Column({ type: "uuid" })
  division_id!: string;

  @ManyToOne(() => DivisionEntity, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn({
    name: "division_id",
    foreignKeyConstraintName: "fk_idr_division",
  })
  division!: DivisionEntity;

  @OneToOne(
    () => IncomingDocumentRoutingAssignmentCounterEntity,
    (counter) => counter.routing,
  )
  assignment_counters!: IncomingDocumentRoutingAssignmentCounterEntity;
}
