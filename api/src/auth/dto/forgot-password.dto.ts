import { IsEmail, IsString } from 'class-validator';

/**
 * DTO for Forgot Password Request
 *
 * Used when a user requests a password reset email
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsString()
  email: string;
}
