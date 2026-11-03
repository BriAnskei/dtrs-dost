import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IncomingDocumentRoutingEntity } from "./incoming-document-routing.entity";

@Entity("incoming_document_routing_assignment_counters")
export class IncomingDocumentRoutingAssignmentCounterEntity {
  @PrimaryColumn({
    type: "uuid",
    name: "routing_id",
  })
  routing_id!: string;

  @OneToOne(
    () => IncomingDocumentRoutingEntity,
    (routing) => routing.assignment_counters,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({
    name: "routing_id",
    foreignKeyConstraintName: "fk_routing_assignment_counters_routing",
  })
  routing!: IncomingDocumentRoutingEntity;

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
