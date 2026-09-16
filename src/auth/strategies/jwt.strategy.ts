import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  // Discriminates a staff access token from a client-portal one (see
  // ClientJwtPayload/ClientJwtStrategy) — both are signed with the same
  // JWT_SECRET, so this is what actually keeps a client's "weak" token
  // from being accepted here (and vice versa), not just the shape of the
  // payload. Optional only so a token issued before this field existed
  // isn't rejected mid-flight — those are all short-lived (15m) access
  // tokens anyway, so this is purely transitional.
  type?: 'staff';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (payload.type && payload.type !== 'staff') {
      throw new UnauthorizedException();
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
    };
  }
}
