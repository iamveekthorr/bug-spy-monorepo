import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class Login {
  @IsEmail()
  @IsString()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  password: string;
}
