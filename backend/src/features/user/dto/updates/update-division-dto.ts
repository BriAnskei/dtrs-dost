import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateDivisionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  division_name!: string;
}
