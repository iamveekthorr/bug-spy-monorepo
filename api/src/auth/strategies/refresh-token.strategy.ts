import { Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

import { JwtPayload } from '../dto/jwt-payload.dto';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    @Inject('JWT_REFRESH_SECRET') private readonly jwtSecret: string,
  ) {
    super({
      secretOrKey: jwtSecret,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req.cookies?.['refresh_token'];
        },
      ]),
    });
  }

  validate(payload: JwtPayload) {
    return { ...payload };
  }
}
