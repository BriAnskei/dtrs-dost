import { IsBoolean, IsOptional } from "class-validator";

export class SetUserManagementPermissionDto {
  @IsOptional()
  @IsBoolean()
  add?: boolean;

  @IsOptional()
  @IsBoolean()
  edit?: boolean;

  @IsOptional()
  @IsBoolean()
  reset_password?: boolean;

  @IsOptional()
  @IsBoolean()
  deactivate?: boolean;

  @IsOptional()
  @IsBoolean()
  reactivate?: boolean;

  @IsOptional()
  @IsBoolean()
  delete?: boolean;
}
