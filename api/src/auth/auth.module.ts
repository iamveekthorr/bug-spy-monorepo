import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

import { UsersModule } from '~/users/users.module';
import { User, UserSchema } from '~/users/schema/user.schema';
import { EmailModule } from '~/common/email/email.module';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  JwtAccessSecretProvider,
  JwtRefreshSecretProvider,
} from './providers/jwt.provider';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GitHubStrategy } from './strategies/github.strategy';

// Conditionally include OAuth strategies only if credentials are configured
const getOAuthProviders = (): any[] => {
  const configService = new ConfigService();
  const providers: any[] = [
    AuthService,
    JwtAccessSecretProvider,
    JwtRefreshSecretProvider,
    AccessTokenStrategy,
    RefreshTokenStrategy,
  ];

  // Only add Google strategy if credentials exist
  const googleClientId = configService.get<string>('GOOGLE_CLIENT_ID');
  if (googleClientId && googleClientId.trim() !== '') {
    providers.push(GoogleStrategy);
  }

  // Only add GitHub strategy if credentials exist
  const githubClientId = configService.get<string>('GITHUB_CLIENT_ID');
  if (githubClientId && githubClientId.trim() !== '') {
    providers.push(GitHubStrategy);
  }

  return providers;
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    forwardRef(() => UsersModule),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: getOAuthProviders(),
  exports: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    JwtAccessSecretProvider,
    JwtRefreshSecretProvider,
  ],
})
export class AuthModule {}
