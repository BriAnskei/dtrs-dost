import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { DivisionNoticeOfActionDto } from "./notice-of-action-dto";

export class AssignIncomingDocumentToDivisionDto {
  @IsUUID()
  incomingDocumentId!: string;

  @IsUUID()
  divisionId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DivisionNoticeOfActionDto)
  noticesOfAction?: DivisionNoticeOfActionDto[];
}
