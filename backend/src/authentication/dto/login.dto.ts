import { IsBoolean, IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(5)
  password!: string;

  @IsBoolean()
  remember_me!: boolean;
}
