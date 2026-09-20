import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from "class-validator";
import { Role } from "../../auth/authorization/roles.enum";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @IsEmail({}, { message: "Email must be a valid email address." })
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
  @Matches(/^09\d{9}$/, {
    message: "Contact number must start with 09 and contain exactly 11 digits",
  })
  contact_number?: string;
}
