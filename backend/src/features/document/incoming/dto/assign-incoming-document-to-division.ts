import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class DivisionNoticeOfActionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(/\S/, {
    message: "Notice of action cannot be empty.",
  })
  noticeOfAction!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  noticeDescription?: string | null;
}

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
