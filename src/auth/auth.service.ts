import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CompanyDocumentType, UserRole, type User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Profile } from 'passport-google-oauth20';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

interface GoogleRegisterState {
  companyDocument: string;
  companyDocumentType: CompanyDocumentType;
}

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
   * `stateRaw` carries the company document/type collected on the register
   * form before the browser was redirected to Google — base64 JSON, set by
   * the front. Only needed for brand-new accounts; an existing user just
   * logs in.
   */
  async loginOrRegisterWithGoogle(profile: Profile, stateRaw?: string) {
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

    if (user) {
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }
    } else {
      const state = this.parseGoogleState(stateRaw);

      const existingDocument = await this.prisma.company.findUnique({
        where: { document: state.companyDocument },
      });
      if (existingDocument) {
        throw new ConflictException('Este CNPJ/CPF já está cadastrado.');
      }

      user = await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name,
            document: state.companyDocument,
            documentType: state.companyDocumentType,
          },
        });
        return tx.user.create({
          data: {
            name,
            email,
            googleId,
            role: UserRole.ADMIN,
            companyId: company.id,
          },
        });
      });
    }

    return { accessToken: await this.signToken(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return this.toSafeUser(user);
  }

  private parseGoogleState(stateRaw?: string): GoogleRegisterState {
    if (!stateRaw) {
      throw new BadRequestException(
        'Informe o tipo e o documento do escritório antes de continuar com Google.',
      );
    }

    let parsed: Partial<GoogleRegisterState>;
    try {
      parsed = JSON.parse(
        Buffer.from(stateRaw, 'base64').toString('utf8'),
      ) as Partial<GoogleRegisterState>;
    } catch {
      throw new BadRequestException('Estado inválido.');
    }

    if (!parsed.companyDocument || !parsed.companyDocumentType) {
      throw new BadRequestException(
        'Informe o tipo e o documento do escritório antes de continuar com Google.',
      );
    }

    return parsed as GoogleRegisterState;
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
