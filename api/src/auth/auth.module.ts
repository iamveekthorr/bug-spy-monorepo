import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';

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

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    forwardRef(() => UsersModule),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessSecretProvider,
    JwtRefreshSecretProvider,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    GoogleStrategy,
    GitHubStrategy,
  ],
  exports: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    JwtAccessSecretProvider,
    JwtRefreshSecretProvider,
  ],
})
export class AuthModule {}
