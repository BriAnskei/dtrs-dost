import { CreateIncomingDocumentDto } from "../../dto/create-incoming-document.dto";

export class CreateIncomingDocumentCommand {
  constructor(
    public readonly dto: CreateIncomingDocumentDto,
    public readonly file: Express.Multer.File,
    public readonly uploaderId: string,
  ) {}
}
