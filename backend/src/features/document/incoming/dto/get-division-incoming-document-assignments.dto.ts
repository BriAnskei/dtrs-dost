import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AssignmentStatus } from "../enums/assignment-status.enum";
import { AssignmentSort } from "./get-incoming-document-assignments-dto";

export class GetDivisionIncomingDocumentAssignmentsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsEnum(AssignmentSort)
  sort: AssignmentSort = AssignmentSort.NEWEST;

  @IsOptional()
  @IsString()
  cursor?: string;
}
