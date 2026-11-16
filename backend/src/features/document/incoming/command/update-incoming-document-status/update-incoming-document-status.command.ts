import { Command } from "@nestjs/cqrs";

import { IncomingDocumentStatus } from "../../entities/incoming-document-entity";

export class UpdateIncomingDocumentStatusCommand extends Command<void> {
  constructor(
    public readonly incomingDocumentId: string,
    public readonly statusTo: IncomingDocumentStatus,
    public readonly changedBy: string,
    public readonly remarks?: string,
  ) {
    super();
  }
}
