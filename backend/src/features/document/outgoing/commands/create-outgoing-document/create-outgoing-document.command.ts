import { Command } from "@nestjs/cqrs";
import { CreateOutgoingDocumentDto } from "../../dto/create-outgoing-document-dto";

export interface OutgoingDocumentFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export class CreateOutgoingDocumentCommand extends Command<{
  id: string;
  documentFileId: string;
}> {
  constructor(
    public readonly dto: CreateOutgoingDocumentDto,
    public readonly file: OutgoingDocumentFile,
    public readonly uploaderId: string,
  ) {
    super();
  }
}
