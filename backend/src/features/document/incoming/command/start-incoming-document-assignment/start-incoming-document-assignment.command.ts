export class StartIncomingDocumentAssignmentCommand {
  constructor(
    public readonly assignmentId: string,
    public readonly divisionId: string | null,
  ) {}
}
