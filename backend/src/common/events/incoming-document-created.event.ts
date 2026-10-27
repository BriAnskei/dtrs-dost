export class IncomingDocumentCreatedEvent {
  constructor(
    public readonly incomingDocumentId: string,
    public readonly documentFileId: string,
    public readonly uploaderId: string,
    public readonly subject: string,
    public readonly documentFrom: string,
    public readonly recipient: string,
  ) {}
}
