export class OutgoingDocumentCreatedEvent {
  constructor(
    public readonly outgoingDocumentId: string,
    public readonly documentFileId: string,
    public readonly uploaderId: string,
    public readonly subject: string,
    public readonly recipient: string,
  ) {}
}
