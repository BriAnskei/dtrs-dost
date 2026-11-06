import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from "class-validator";
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
  @IsArray()
  @ArrayMinSize(1, {
    message: "At least one notice of action is required.",
  })
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DivisionNoticeOfActionDto)
  noticesOfActions!: DivisionNoticeOfActionDto[];
}
