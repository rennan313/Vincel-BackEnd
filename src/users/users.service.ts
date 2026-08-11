import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, type User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 10;

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: ListUsersDto) {
    const companyId = resolveCompanyId(currentUser, query.companyId);
    const where: Prisma.UserWhereInput = {
      companyId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_SELECT,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(currentUser: AuthenticatedUser, dto: CreateUserDto) {
    const companyId = resolveCompanyId(currentUser, dto.companyId);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Este e-mail já está em uso.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
        companyId,
      },
      select: SAFE_SELECT,
    });
  }

  async update(currentUser: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    await this.findScoped(currentUser, id);

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Este e-mail já está em uso.');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { name: dto.name, email: dto.email, role: dto.role },
      select: SAFE_SELECT,
    });
  }

  async setActive(currentUser: AuthenticatedUser, id: string, active: boolean) {
    await this.findScoped(currentUser, id);
    return this.prisma.user.update({
      where: { id },
      data: { active },
      select: SAFE_SELECT,
    });
  }

  private async findScoped(
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      user.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return user;
  }
}
