export class UserDisabledEvent {
  constructor(
    public readonly userId: string,
    public readonly actorUserId: string,
  ) {}
}
