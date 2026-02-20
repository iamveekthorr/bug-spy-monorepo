import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

import { AuthService } from '../auth.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || '',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, username, emails, displayName, photos } = profile;

    const email = emails && emails.length > 0 ? emails[0].value : null;
    const avatar = photos && photos.length > 0 ? photos[0].value : null;
    const name = displayName || username;

    if (!email) {
      return done(new Error('Email not provided by GitHub'), false);
    }

    try {
      const user = await this.authService.findOrCreateOAuthUser({
        provider: 'github',
        providerId: id,
        email,
        displayName: name,
        avatar,
      });

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
