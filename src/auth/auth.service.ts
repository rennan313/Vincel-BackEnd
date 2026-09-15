import { randomBytes, createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  SubscriptionStatus,
  UserRole,
  type Prisma,
  type User,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Profile } from 'passport-google-oauth20';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteGoogleRegistrationDto } from './dto/complete-google-registration.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;
const GOOGLE_PENDING_PURPOSE = 'google-register-pending';
const GOOGLE_PENDING_EXPIRES_IN = '10m';
const REFRESH_TOKEN_BYTES = 64;
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 30;

interface GooglePendingPayload {
  purpose: typeof GOOGLE_PENDING_PURPOSE;
  googleId: string;
  email: string;
  name: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type GoogleAuthResult =
  | ({ status: 'authenticated' } & TokenPair)
  | { status: 'pending'; pendingToken: string; name: string; email: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const [existingEmail, existingDocument] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.company.findUnique({
        where: { document: dto.companyDocument },
      }),
    ]);
    if (existingEmail) {
      throw new ConflictException('Este e-mail já está em uso.');
    }
    if (existingDocument) {
      throw new ConflictException('Este CNPJ/CPF já está cadastrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const { user, company } = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.name,
          document: dto.companyDocument,
          documentType: dto.companyDocumentType,
        },
      });
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: UserRole.ADMIN,
          companyId: company.id,
        },
      });
      await this.startTrialSubscription(tx, company.id);
      return { user, company };
    });

    return {
      ...(await this.issueTokenPair(user)),
      user: this.toSafeUser(user),
      company: {
        id: company.id,
        name: company.name,
        document: company.document,
        documentType: company.documentType,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Same generic message for "no such user", "Google-only account" (no
    // passwordHash to compare against) and "wrong password" — never confirm
    // which one it was, that's a user-enumeration/credential-guessing leak.
    const invalidCredentials = () =>
      new UnauthorizedException('E-mail ou senha inválidos.');

    if (!user || !user.passwordHash) {
      throw invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    if (!user.active) {
      throw new UnauthorizedException(
        'Esta conta foi desativada. Fale com o administrador do escritório.',
      );
    }

    return {
      ...(await this.issueTokenPair(user)),
      user: this.toSafeUser(user),
    };
  }

  /**
   * Called right after Google auth succeeds. An existing account (matched by
   * googleId or e-mail) just logs in. A brand-new signup can't be finished
   * yet — we don't have the company document — so it gets a short-lived
   * "pending" token carrying the Google profile, and the front shows a
   * lightweight follow-up step asking only for that.
   */
  async loginOrRegisterWithGoogle(profile: Profile): Promise<GoogleAuthResult> {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new BadRequestException(
        'Não foi possível obter o e-mail da conta Google.',
      );
    }
    const name = profile.displayName || email;

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      const pendingToken = await this.jwt.signAsync(
        {
          purpose: GOOGLE_PENDING_PURPOSE,
          googleId,
          email,
          name,
        } satisfies GooglePendingPayload,
        { expiresIn: GOOGLE_PENDING_EXPIRES_IN },
      );
      return { status: 'pending', pendingToken, name, email };
    }

    if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    return { status: 'authenticated', ...(await this.issueTokenPair(user)) };
  }

  /** Finishes a brand-new Google signup once the company document is known. */
  async completeGoogleRegistration(dto: CompleteGoogleRegistrationDto) {
    const pending = await this.verifyGooglePendingToken(dto.pendingToken);

    const [existingEmail, existingDocument] = await Promise.all([
      this.prisma.user.findFirst({
        where: {
          OR: [{ googleId: pending.googleId }, { email: pending.email }],
        },
      }),
      this.prisma.company.findUnique({
        where: { document: dto.companyDocument },
      }),
    ]);
    if (existingEmail) {
      throw new ConflictException('Esta conta Google já está cadastrada.');
    }
    if (existingDocument) {
      throw new ConflictException('Este CNPJ/CPF já está cadastrado.');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: pending.name,
          document: dto.companyDocument,
          documentType: dto.companyDocumentType,
        },
      });
      const user = await tx.user.create({
        data: {
          name: pending.name,
          email: pending.email,
          googleId: pending.googleId,
          role: UserRole.ADMIN,
          companyId: company.id,
        },
      });
      await this.startTrialSubscription(tx, company.id);
      return user;
    });

    return {
      ...(await this.issueTokenPair(user)),
      user: this.toSafeUser(user),
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return this.toSafeUser(user);
  }

  private async verifyGooglePendingToken(
    pendingToken: string,
  ): Promise<GooglePendingPayload> {
    let payload: GooglePendingPayload;
    try {
      payload = await this.jwt.verifyAsync<GooglePendingPayload>(pendingToken);
    } catch {
      throw new BadRequestException(
        'Sessão do Google expirada. Tente novamente.',
      );
    }
    if (payload.purpose !== GOOGLE_PENDING_PURPOSE) {
      throw new BadRequestException('Token inválido.');
    }
    return payload;
  }

  /**
   * Renews an access token from a still-valid refresh token, rotating it in
   * the same move (the caller must start using the returned refreshToken —
   * the one it sent is revoked here). Rotation lets a reuse of an
   * already-consumed token be detected below and treated as a stolen token,
   * rather than only ever growing the token's blast radius over 30 days.
   */
  async refreshTokens(rawToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    if (stored.revokedAt) {
      // This token was already rotated away (or explicitly revoked) once —
      // seeing it again means it leaked. Kill every refresh token on the
      // account so both the thief and the legitimate user are forced back
      // through login, rather than trusting a chain that's proven unsafe.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(stored.user);
  }

  /** Revokes a single refresh token (e.g. on logout) without touching the rest of the account's sessions. */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(user),
      this.issueRefreshToken(user.id),
    ]);
    return { accessToken, refreshToken };
  }

  private signToken(user: User): Promise<string> {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const ttlDays =
      Number(this.config.get<string>('REFRESH_TOKEN_TTL_DAYS')) ||
      DEFAULT_REFRESH_TOKEN_TTL_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await this.prisma.refreshToken.create({
      data: { tokenHash: this.hashToken(rawToken), userId, expiresAt },
    });

    return rawToken;
  }

  /**
   * Refresh tokens are high-entropy random values, not low-entropy secrets
   * like passwords — a fast, deterministic hash (rather than bcrypt) is the
   * right tool here, since it's what makes an indexed `tokenHash` lookup
   * possible at all.
   */
  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
  }

  /**
   * Every new company starts on a free trial of the default plan — no
   * acquirer involved yet (see the Subscription.acquirer comment). A no-op
   * if no plan is marked isDefault, so signup never fails over billing not
   * being configured yet.
   */
  private async startTrialSubscription(
    tx: Prisma.TransactionClient,
    companyId: string,
  ): Promise<void> {
    const defaultPlan = await tx.plan.findFirst({
      where: { isDefault: true, active: true, deletedAt: null },
    });
    if (!defaultPlan) return;

    // ConfigService doesn't cast env values — they're always strings, so
    // this must be parsed explicitly or `getDate() + trialDays` silently
    // string-concatenates instead of adding.
    const trialDays =
      Number(this.config.get<string>('SIGNUP_TRIAL_DAYS')) || 30;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    await tx.subscription.create({
      data: {
        companyId,
        planId: defaultPlan.id,
        status: SubscriptionStatus.TRIALING,
        trialEndsAt,
      },
    });
  }
}
