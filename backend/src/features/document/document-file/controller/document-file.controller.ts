import { Controller, Get, Param, ParseUUIDPipe, StreamableFile } from "@nestjs/common";
import { create } from "content-disposition";
import { Roles } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import { GetDocumentFileUseCase } from "../usecase/get-document-file.usecase";

@Controller("document-files")
export class DocumentFileController {
  constructor(private readonly getDocumentFileUsecase: GetDocumentFileUseCase) {}

  @Get(":id/file")
  @Roles(Role.SuperAdmin, Role.Admin)
  async file(@Param("id", ParseUUIDPipe) id: string) {
    const { stream, filename } = await this.getDocumentFileUsecase.getFileStream(id);

    return new StreamableFile(stream, {
      type: "application/pdf",
      disposition: create(filename, { type: "inline" }),
    });
  }
}
