import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

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

  @IsString()
  @IsNotEmpty()
  division!: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  contact_number?: string;
}
