import { CreateIncomingDocumentDto } from "../../dto/create-incoming-document.dto";

export class CreateIncomingFromQueueCommand {
  constructor(
    public readonly queueId: string,
    public readonly dto: CreateIncomingDocumentDto,
    public readonly uploaderId: string,
  ) {}
}
