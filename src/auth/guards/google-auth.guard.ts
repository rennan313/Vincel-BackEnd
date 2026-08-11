import { Injectable, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const state =
      typeof request.query.state === 'string' ? request.query.state : undefined;
    return { state };
  }
}
