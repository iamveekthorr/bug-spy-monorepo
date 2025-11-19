import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

import { AppError } from '~/common/app-error.common';
import { JwtPayload } from '../dto/jwt-payload.dto';
import { UserService } from '~/users/user.service';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly userService: UserService,
    @Inject('JWT_ACCESS_SECRET') private readonly _jwtSecret: string,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: _jwtSecret,
    });
  }

  public async validate(payload: JwtPayload) {
    const { sub } = payload;

    // find user using the provided token
    const user = await this.userService.getUserById(sub);

    if (!user)
      throw new AppError(
        `no user Found with the id ${sub}`,
        HttpStatus.NOT_FOUND,
      );

    return user;
  }
}
