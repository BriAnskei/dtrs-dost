import { IsEnum, IsOptional } from "class-validator";
import { OfficeType } from "../entities/incoming-document-assignment.entity";
import { AssignmentStatus } from "../enums/assignment-status.enum";

export enum AssignmentSort {
  NEWEST = "newest",
  OLDEST = "oldest",
}

export class GetIncomingDocumentAssignmentsDto {
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsEnum(OfficeType)
  officeType?: OfficeType;

  @IsOptional()
  @IsEnum(AssignmentSort)
  sort?: AssignmentSort = AssignmentSort.NEWEST;
}
