import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtrereshGuard extends AuthGuard('jwt-refresh') {}
