export class UserDeactivatedEvent {
  constructor(
    public readonly userId: string,
    public readonly actorUserId: string,
  ) {}
}
