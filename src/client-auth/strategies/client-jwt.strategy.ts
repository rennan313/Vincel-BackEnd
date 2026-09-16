import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** A client-portal access token — deliberately "weak": no refresh token,
 * no role/permission claims, just enough to prove which Client this is.
 * Signed with the same JWT_SECRET as staff tokens (see auth.module's
 * JwtModule), so `type: 'client'` (checked below, and the mirror check in
 * JwtStrategy for `type: 'staff'`) is what actually keeps the two kinds
 * from being interchangeable — not just differing payload shapes. */
export interface ClientJwtPayload {
  sub: string;
  companyId: string;
  type: 'client';
}

export interface AuthenticatedClient {
  id: string;
  companyId: string;
}

@Injectable()
export class ClientJwtStrategy extends PassportStrategy(
  Strategy,
  'client-jwt',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: ClientJwtPayload): AuthenticatedClient {
    if (payload.type !== 'client') {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, companyId: payload.companyId };
  }
}
