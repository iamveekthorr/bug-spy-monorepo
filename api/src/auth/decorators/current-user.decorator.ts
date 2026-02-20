import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '~/types/user.type';

export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext): Record<string, unknown> => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.user; // Non-null assertion
  },
);
