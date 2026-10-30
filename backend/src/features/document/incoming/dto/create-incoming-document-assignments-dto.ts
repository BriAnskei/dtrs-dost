import { Type } from "class-transformer";
import { IsDefined, IsEnum, IsUUID, ValidateIf, ValidateNested } from "class-validator";
import { OfficeType } from "../entities/incoming-document-assignment.entity";
import { DivisionNoticeOfActionDto } from "./notice-of-action-dto";

export class CreateIncomingDocumentAssignmentsDto {
  @IsEnum(OfficeType)
  officeType!: OfficeType;

  @ValidateIf((o) => o.officeType === OfficeType.DIVISION)
  @IsDefined()
  @IsUUID()
  incomingDocumentRoutingId?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => DivisionNoticeOfActionDto)
  noticesOfActions!: DivisionNoticeOfActionDto[];
}
