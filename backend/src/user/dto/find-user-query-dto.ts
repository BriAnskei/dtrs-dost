import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { SortOrder } from "../enums/sort-order.enum";

export class FindUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  role_id?: number;

  @IsOptional()
  @IsEnum(SortOrder)
  sort: SortOrder = SortOrder.Newest;

  @IsOptional()
  @IsString()
  cursor?: string;
}
