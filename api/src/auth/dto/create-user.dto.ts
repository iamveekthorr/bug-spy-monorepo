import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Matcher } from '../decorators/matcher.decorator';

export class RegistrationDTO {
  @IsNotEmpty({ message: 'Email cannot be empty!' })
  @IsString()
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'password cannot be empty!' })
  @IsString()
  @MaxLength(20)
  @MinLength(8)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password too weak',
  })
  password: string;

  @IsNotEmpty({ message: 'Confirm password cannot be empty!' })
  @IsString()
  @MaxLength(20)
  @MinLength(8)
  @Matcher('password', { message: 'Confirm password does not match password!' })
  confirmPassword: string;
}
