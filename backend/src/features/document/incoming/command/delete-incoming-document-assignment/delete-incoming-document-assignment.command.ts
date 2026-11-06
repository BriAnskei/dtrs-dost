export class DeleteIncomingDocumentAssignmentCommand {
  constructor(
    public readonly assignmentId: string,
    public readonly incomingDocumentId: string,
  ) {}
}
