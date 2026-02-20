import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { Login } from './dto/login.dto';
import { RegistrationDTO } from './dto/create-user.dto';
import { JwtPayload } from './dto/jwt-payload.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { User } from '~/users/schema/user.schema';
import { AppError } from '~/common/app-error.common';
import { EmailService } from '~/common/email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_RESET_ATTEMPTS_PER_DAY = 5; // Rate limiting
  private readonly RESET_ATTEMPT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly emailService: EmailService,
  ) {}

  async login(loginDTO: Login) {
    const { email, password } = loginDTO;

    try {
      const doc = await this.userModel.findOne({ email }).select('+password');

      if (!doc) {
        throw new AppError(
          'Invalid email or password',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Check that the password provided matches
      const isCorrectPassword = await bcrypt.compare(password, doc.password);

      if (!isCorrectPassword) {
        throw new AppError(
          'Invalid email or password',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Get the user ID before flattening
      const userId = doc._id.toString();

      const { password: _, ...user } = doc.toObject({
        flattenObjectIds: true,
        versionKey: false,
      });

      // Ensure _id is always a string in the response
      const userResponse = {
        ...user,
        _id: userId,
        id: userId, // Include both for compatibility
      };

      return { user: userResponse };
    } catch (error) {
      // Re-throw AppError instances to preserve custom error handling
      if (error instanceof AppError) {
        throw error;
      }

      // Handle unexpected database or bcrypt errors
      throw new AppError(
        'Authentication failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async signup(registrationDTO: RegistrationDTO) {
    try {
      // Check if the user exists
      const existingUser = await this.userModel.findOne({
        email: registrationDTO.email,
      });

      // If user exists, prevent duplicate registration
      if (existingUser) {
        throw new AppError('User already exists', HttpStatus.CONFLICT);
      }

      // Encrypt user password if it's a new user
      const encryptedPassword = await bcrypt.hash(
        registrationDTO.password,
        this.SALT_ROUNDS,
      );

      // Save the data to the DB
      const doc = await this.userModel.create({
        email: registrationDTO.email,
        password: encryptedPassword,
      });

      // Write email to cache to prevent duplicate registrations
      await this.cacheManager.set<boolean>(
        doc.email,
        true,
        60 * 60 * 6 * 1000,
      );

      // Get the user ID and transform to plain object
      const userId = doc._id.toString();
      const { password: _, ...user } = doc.toObject({
        flattenObjectIds: true,
        versionKey: false,
      });

      // Include both _id and id for compatibility
      const userResponse = {
        ...user,
        _id: userId,
        id: userId,
      };

      return { user: userResponse };
    } catch (error) {
      // Re-throw AppError instances to preserve custom error handling
      if (error instanceof AppError) {
        throw error;
      }

      // Handle database validation errors
      if (error.name === 'ValidationError' || error.code === 11000) {
        throw new AppError('Invalid user data', HttpStatus.BAD_REQUEST);
      }

      // Handle unexpected errors
      throw new AppError(
        'User registration failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateTokens(payload: JwtPayload) {
    try {
      const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET');

      if (!accessSecret || !refreshSecret) {
        throw new AppError(
          'JWT configuration error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          expiresIn: 60 * 60 * 24, // 1D
          secret: accessSecret,
        }),
        this.jwtService.signAsync(payload, {
          expiresIn: 60 * 60 * 24 * 7, // 1 week
          secret: refreshSecret,
        }),
      ]);

      return { accessToken, refreshToken };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Token generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOrCreateOAuthUser(data: {
    provider: string;
    providerId: string;
    email: string;
    displayName?: string;
    avatar?: string;
  }) {
    try {
      const { provider, providerId, email, displayName, avatar } = data;

      // First, try to find user by provider and providerId
      let user = await this.userModel.findOne({ provider, providerId });

      if (user) {
        // User exists with this OAuth provider
        return user.toObject({
          flattenObjectIds: true,
          versionKey: false,
        });
      }

      // Check if user exists with this email but different provider
      const existingUserWithEmail = await this.userModel.findOne({ email });

      if (existingUserWithEmail) {
        // User exists with same email but different provider
        // This is a security consideration - you might want to link accounts or throw an error
        // For now, we'll throw an error to prevent account takeover
        throw new AppError(
          'An account with this email already exists. Please sign in with your original provider.',
          HttpStatus.CONFLICT,
        );
      }

      // Create new user
      user = await this.userModel.create({
        email,
        provider,
        providerId,
        displayName,
        avatar,
      });

      return user.toObject({
        flattenObjectIds: true,
        versionKey: false,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      // Handle database errors
      if (error.code === 11000) {
        throw new AppError(
          'User already exists with this provider',
          HttpStatus.CONFLICT,
        );
      }

      throw new AppError(
        'OAuth authentication failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Request password reset - generates token and sends email
   *
   * Security measures:
   * - Rate limiting (5 attempts per 24 hours)
   * - Secure token generation (crypto.randomBytes)
   * - Token hashing before storage
   * - 30-minute expiration
   * - Email sent with reset link
   *
   * @param forgotPasswordDto - Contains user email
   * @returns Success message (deliberately vague for security)
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordDto;

      // Find user with password reset fields selected
      const user = await this.userModel
        .findOne({ email })
        .select(
          '+resetPasswordToken +resetPasswordExpires +resetPasswordAttempts +lastResetPasswordRequest',
        );

      // Security: Always return same message whether user exists or not
      // This prevents email enumeration attacks
      if (!user) {
        this.logger.log(
          `Password reset requested for non-existent email: ${email}`,
        );
        return {
          message:
            'If your email exists in our system, you will receive a password reset link shortly.',
        };
      }

      // Security: Check if user is OAuth user (no password to reset)
      if (user.provider !== 'local') {
        this.logger.log(
          `Password reset attempted for OAuth user: ${email}, provider: ${user.provider}`,
        );
        return {
          message:
            'If your email exists in our system, you will receive a password reset link shortly.',
        };
      }

      // Security: Rate limiting check
      await this.checkResetRateLimit(user);

      // Generate secure random token (32 bytes = 256 bits)
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Hash token before storing (don't store plain token)
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Update user with hashed token and expiration
      const now = new Date();
      const expirationDate = new Date(
        now.getTime() + this.RESET_TOKEN_EXPIRY_MS,
      );

      // Reset or increment attempts counter
      const shouldResetCounter =
        !user.lastResetPasswordRequest ||
        now.getTime() - user.lastResetPasswordRequest.getTime() >
          this.RESET_ATTEMPT_WINDOW_MS;

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = expirationDate;
      user.resetPasswordAttempts = shouldResetCounter
        ? 1
        : (user.resetPasswordAttempts || 0) + 1;
      user.lastResetPasswordRequest = now;

      await user.save();

      this.logger.log(`Password reset token generated for user: ${email}`);

      // Send password reset email
      try {
        await this.emailService.sendPasswordResetEmail(email, resetToken);
        this.logger.log(`Password reset email sent to: ${email}`);
      } catch (emailError) {
        // Log email error but don't fail the request
        // User should still receive success message for security
        this.logger.error(
          `Failed to send password reset email to ${email}:`,
          emailError,
        );
      }

      return {
        message:
          'If your email exists in our system, you will receive a password reset link shortly.',
        // Only include token in development for testing
        ...(process.env.NODE_ENV === 'development' && { token: resetToken }),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      this.logger.error('Forgot password error:', error);
      // Return generic success message even on error for security
      return {
        message:
          'If your email exists in our system, you will receive a password reset link shortly.',
      };
    }
  }

  /**
   * Reset password with token
   *
   * Security measures:
   * - Token validation (hashed comparison)
   * - Expiration check
   * - Single-use token (deleted after use)
   * - Strong password requirements (enforced by DTO)
   * - Password hashing with bcrypt
   *
   * @param resetPasswordDto - Contains token and new password
   * @returns Success message
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const { token, newPassword } = resetPasswordDto;

      // Hash the provided token to compare with stored hash
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user with matching token that hasn't expired
      const user = await this.userModel
        .findOne({
          resetPasswordToken: hashedToken,
          resetPasswordExpires: { $gt: new Date() },
        })
        .select('+password +resetPasswordToken +resetPasswordExpires');

      if (!user) {
        this.logger.warn('Invalid or expired reset token used');
        throw new AppError(
          'Password reset token is invalid or has expired. Please request a new password reset.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password and clear reset fields
      user.password = hashedPassword;
      user.resetPasswordToken = null as any;
      user.resetPasswordExpires = null as any;
      user.resetPasswordAttempts = 0;

      await user.save();

      this.logger.log(`Password successfully reset for user: ${user.email}`);

      // TODO: Optional - Invalidate all refresh tokens for this user for security
      // This would require tracking refresh tokens in a separate collection

      // Send confirmation email
      try {
        await this.emailService.sendPasswordResetConfirmationEmail(user.email);
        this.logger.log(
          `Password reset confirmation email sent to: ${user.email}`,
        );
      } catch (emailError) {
        // Log but don't fail - password has already been reset successfully
        this.logger.error(
          `Failed to send confirmation email to ${user.email}:`,
          emailError,
        );
      }

      return {
        message:
          'Password has been reset successfully. You can now log in with your new password.',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      this.logger.error('Reset password error:', error);
      throw new AppError(
        'Failed to reset password. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if user has exceeded password reset rate limit
   * Throws error if rate limit exceeded
   */
  private async checkResetRateLimit(user: any): Promise<void> {
    const now = new Date();
    const lastRequest = user.lastResetPasswordRequest;

    // Check if within 24-hour window
    if (
      lastRequest &&
      now.getTime() - lastRequest.getTime() < this.RESET_ATTEMPT_WINDOW_MS
    ) {
      const attempts = user.resetPasswordAttempts || 0;

      if (attempts >= this.MAX_RESET_ATTEMPTS_PER_DAY) {
        this.logger.warn(
          `Rate limit exceeded for password reset: ${user.email}`,
        );
        throw new AppError(
          'Too many password reset attempts. Please try again in 24 hours.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }
}
