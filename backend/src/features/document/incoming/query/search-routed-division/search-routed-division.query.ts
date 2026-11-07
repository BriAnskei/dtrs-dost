export class SearchRoutedDivisionQuery {
  constructor(
    public readonly incomingDocumentId: string,
    public readonly search: string,
  ) {}
}
