import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { Login } from './dto/login.dto';
import { RegistrationDTO } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: Login, @Res({ passthrough: true }) res: Response) {
    const { user } = await this.authService.login(data);

    // Extract user ID - handle both _id and id fields
    const userId = user._id?.toString() || user.id?.toString() || (user._id as any) || (user.id as any);

    if (!userId) {
      this.logger.error(`User ID not found in user object`);
      throw new Error('User ID not found in user object');
    }

    const { accessToken, refreshToken } = await this.authService.generateTokens(
      {
        sub: userId,
      },
    );

    // save refresh token as httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production (HTTPS)
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      path: '/api/v1/auth/refresh', // Only send to this route
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user, accessToken };
  }

  @Post('/signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() data: RegistrationDTO, @Res({ passthrough: true }) res: Response) {
    const { user } = await this.authService.signup(data);

    // Extract user ID
    const userId = user._id?.toString() || user.id?.toString();

    if (!userId) {
      this.logger.error(`User ID not found in signup response`);
      throw new Error('User ID not found after signup');
    }

    // Generate tokens for the new user
    const { accessToken, refreshToken } = await this.authService.generateTokens({
      sub: userId,
    });

    // Save refresh token as httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user, accessToken };
  }

  @Post('/refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.generateTokens(
      {
        sub: user.sub,
      },
    );

    // Update refresh token cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { accessToken };
  }

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    // Clear the refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Request Password Reset Email
   *
   * Security: Returns generic success message even if email doesn't exist
   * to prevent email enumeration attacks.
   * Rate limited to 5 attempts per 24 hours per email.
   */
  @Post('/forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  /**
   * Reset Password with Token
   *
   * Token must be:
   * - Valid (matches hashed token in database)
   * - Not expired (within 30 minutes)
   * - Single-use (invalidated after successful reset)
   *
   * Password must meet strength requirements enforced by DTO validation.
   */
  @Post('/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('/google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as any;

    // Extract user ID - handle both _id and id fields
    const userId = user._id?.toString() || user.id?.toString() || (user._id as any) || (user.id as any);

    if (!userId) {
      throw new Error('User ID not found in user object');
    }

    const { accessToken, refreshToken } = await this.authService.generateTokens(
      {
        sub: userId,
      },
    );

    // Save refresh token as httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user, accessToken };
  }

  @Get('/github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Guard redirects to GitHub
  }

  @Get('/github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as any;

    // Extract user ID - handle both _id and id fields
    const userId = user._id?.toString() || user.id?.toString() || (user._id as any) || (user.id as any);

    if (!userId) {
      throw new Error('User ID not found in user object');
    }

    const { accessToken, refreshToken } = await this.authService.generateTokens(
      {
        sub: userId,
      },
    );

    // Save refresh token as httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user, accessToken };
  }
}
