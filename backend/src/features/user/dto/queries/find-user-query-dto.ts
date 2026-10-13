import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { IsValidCursor } from "../../../../common/validators/is-valid-curoser.decorator";
import { UserSortOrder } from "../../enums/user-sort-order-enum";

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
  @IsEnum(UserSortOrder)
  sort: UserSortOrder = UserSortOrder.Newest;

  @IsOptional()
  @IsString()
  @IsValidCursor()
  cursor?: string;
}
