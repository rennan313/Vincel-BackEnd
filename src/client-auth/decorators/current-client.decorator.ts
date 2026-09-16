import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedClient } from '../strategies/client-jwt.strategy';

export const CurrentClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedClient => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedClient }>();
    return request.user;
  },
);
