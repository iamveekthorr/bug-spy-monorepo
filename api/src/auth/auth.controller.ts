import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';

import { AuthService } from './auth.service';
import { Login } from './dto/login.dto';
import { RegistrationDTO } from './dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: Login, @Res({ passthrough: true }) res: Response) {
    const { user } = await this.authService.login(data);

    const { accessToken, refreshToken } = await this.authService.generateTokens(
      {
        sub: user._id.toString(),
      },
    );

    // save refresh token as httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production (HTTPS)
      sameSite: 'strict',
      path: '/api/v1/auth/refresh', // Only send to this route
    });

    return { user, accessToken };
  }

  @Post('/signup')
  signup(@Body() data: RegistrationDTO) {
    return this.authService.signup(data);
  }
}
