import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IncomingDocumentEntity } from "./incoming-document-entity";

@Entity("incoming_document_assignment_counts")
export class IncomingDocumentAssignmentCountEntity {
  @PrimaryColumn({
    type: "uuid",
    name: "incoming_document_id",
  })
  incoming_document_id!: string;

  @OneToOne(
    () => IncomingDocumentEntity,
    (document) => document.assignment_counts,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )

  @JoinColumn({
    name: "incoming_document_id",
    foreignKeyConstraintName: "fk_assignment_counts_document",
  })
  incoming_document!: IncomingDocumentEntity;

  @Column({
    type: "bigint",
    default: 0,
    nullable: false,
  })
  total!: string;

  @Column({
    type: "bigint",
    default: 0,
    nullable: false,
  })
  pending!: string;

  @Column({
    type: "bigint",
    default: 0,
    nullable: false,
  })
  ongoing!: string;

  @Column({
    type: "bigint",
    default: 0,
    nullable: false,
  })
  complete!: string;
}
