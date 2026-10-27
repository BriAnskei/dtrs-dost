import { Injectable, Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { OutgoingDocumentCreatedEvent } from "../events/outgoing-document-create.event";

@EventsHandler(OutgoingDocumentCreatedEvent)
@Injectable()
export class OutgoingDocumentAuditHandler
  implements IEventHandler<OutgoingDocumentCreatedEvent>
{
  private readonly logger = new Logger(OutgoingDocumentAuditHandler.name);

  async handle(event: OutgoingDocumentCreatedEvent): Promise<void> {
    try {
      // TODO: Call your audit service.
      // Example:
      // await this.auditService.record({
      //   action: "OUTGOING_DOCUMENT_CREATED",
      //   actorId: event.uploaderId,
      //   entityId: event.outgoingDocumentId,
      // });

      this.logger.debug(
        `Audit handler received outgoing document ${event.outgoingDocumentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to audit outgoing document ${event.outgoingDocumentId}`,
        error instanceof Error ? error.stack : String(error),
      );

      // Don't silently swallow the failure in a real implementation.
      // Add retry/persistence or another recovery mechanism.
    }
  }
}
