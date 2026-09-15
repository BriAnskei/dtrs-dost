import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @IsUUID()
  @IsOptional()
  division_id?: string;

  @IsInt()
  role_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  full_name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  position?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contact_number?: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;
}
