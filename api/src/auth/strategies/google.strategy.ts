import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;

    const email = emails && emails.length > 0 ? emails[0].value : null;
    const avatar = photos && photos.length > 0 ? photos[0].value : null;

    if (!email) {
      return done(new Error('Email not provided by Google'), false);
    }

    try {
      const user = await this.authService.findOrCreateOAuthUser({
        provider: 'google',
        providerId: id,
        email,
        displayName,
        avatar,
      });

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
