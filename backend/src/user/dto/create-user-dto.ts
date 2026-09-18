import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";
import { Role } from "../../auth/authorization/roles.enum";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsIn(["1", "2", "3", "4"])
  role_id!: string;

  @ValidateIf((o) => o.role_id === Role.Division)
  @IsNotEmpty({
    message: "Division is required for Division users",
  })
  @IsString()
  division?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  contact_number?: string;
}
