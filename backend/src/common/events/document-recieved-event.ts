export class DocumentReceivedEvent {
  constructor(
    public readonly documentFileId: string,
    public readonly queueId: string,
    public readonly actorUserId: string,
  ) {}
}
