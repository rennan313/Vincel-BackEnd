import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole, type Provider } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ListProvidersDto } from './dto/list-providers.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: ListProvidersDto) {
    const companyId = resolveCompanyId(currentUser, query.companyId);
    const where: Prisma.ProviderWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { companyName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(currentUser: AuthenticatedUser, dto: CreateProviderDto) {
    const companyId = resolveCompanyId(currentUser, dto.companyId);

    return this.prisma.provider.create({
      data: {
        name: dto.name,
        role: dto.role,
        customRole: dto.customRole,
        phone: dto.phone,
        email: dto.email,
        companyName: dto.companyName,
        document: dto.document,
        status: dto.status,
        companyId,
        deletedAt: null,
      },
    });
  }

  async update(currentUser: AuthenticatedUser, id: string, dto: UpdateProviderDto) {
    await this.findScoped(currentUser, id);

    return this.prisma.provider.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        customRole: dto.customRole,
        phone: dto.phone,
        email: dto.email,
        companyName: dto.companyName,
        document: dto.document,
        status: dto.status,
      },
    });
  }

  async setActive(currentUser: AuthenticatedUser, id: string, active: boolean) {
    await this.findScoped(currentUser, id);
    return this.prisma.provider.update({ where: { id }, data: { active } });
  }

  private async findScoped(
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<Provider> {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider || provider.deletedAt) {
      throw new NotFoundException('Prestador não encontrado.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      provider.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Prestador não encontrado.');
    }
    return provider;
  }
}
