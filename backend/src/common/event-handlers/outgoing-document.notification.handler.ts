import { Injectable, Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { OutgoingDocumentCreatedEvent } from "../events/outgoing-document-create.event";

@EventsHandler(OutgoingDocumentCreatedEvent)
@Injectable()
export class OutgoingDocumentNotificationHandler
  implements IEventHandler<OutgoingDocumentCreatedEvent>
{
  private readonly logger = new Logger(OutgoingDocumentNotificationHandler.name);

  async handle(event: OutgoingDocumentCreatedEvent): Promise<void> {
    try {
      // TODO: Call your notification service.
      // Example:
      // await this.notificationService.create({
      //   recipientUserId: ...,
      //   message: `Outgoing document "${event.subject}" was created.`,
      // });

      this.logger.debug(
        `Notification handler received outgoing document ${event.outgoingDocumentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify users about ${event.outgoingDocumentId}`,
        error instanceof Error ? error.stack : String(error),
      );

      // Add retry/persistence or another recovery mechanism.
    }
  }
}
