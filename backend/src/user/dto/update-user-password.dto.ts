import { IsString, IsUUID, MinLength } from "class-validator";

export class UpdateUserPasswordDto {
  @IsUUID() user_id!: string;
  @IsString() @MinLength(8) password!: string;
}
