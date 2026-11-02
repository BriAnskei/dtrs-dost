import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { IsValidCursor } from "../../../../common/validators/is-valid-curoser.decorator";
import { OfficeType } from "../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../enums/assignment-status.enum";

export enum AssignmentSort {
  NEWEST = "newest",
  OLDEST = "oldest",
}

export class GetIncomingDocumentAssignmentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsEnum(OfficeType)
  officeType?: OfficeType;

  @IsOptional()
  @IsEnum(AssignmentSort)
  sort: AssignmentSort = AssignmentSort.NEWEST;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsValidCursor()
  cursor?: string;
}
