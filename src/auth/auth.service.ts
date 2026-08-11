import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, type User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Profile } from 'passport-google-oauth20';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteGoogleRegistrationDto } from './dto/complete-google-registration.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;
const GOOGLE_PENDING_PURPOSE = 'google-register-pending';
const GOOGLE_PENDING_EXPIRES_IN = '10m';

interface GooglePendingPayload {
  purpose: typeof GOOGLE_PENDING_PURPOSE;
  googleId: string;
  email: string;
  name: string;
}

export type GoogleAuthResult =
  | { status: 'authenticated'; accessToken: string }
  | { status: 'pending'; pendingToken: string; name: string; email: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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
      return { user, company };
    });

    return {
      accessToken: await this.signToken(user),
      user: this.toSafeUser(user),
      company: {
        id: company.id,
        name: company.name,
        document: company.document,
        documentType: company.documentType,
      },
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

    return { status: 'authenticated', accessToken: await this.signToken(user) };
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
      return tx.user.create({
        data: {
          name: pending.name,
          email: pending.email,
          googleId: pending.googleId,
          role: UserRole.ADMIN,
          companyId: company.id,
        },
      });
    });

    return {
      accessToken: await this.signToken(user),
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

  private signToken(user: User): Promise<string> {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
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
}
