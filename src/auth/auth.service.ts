import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

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

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      company: {
        id: company.id,
        name: company.name,
        document: company.document,
        documentType: company.documentType,
      },
    };
  }
}
