import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole, type Client } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsDto } from './dto/list-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: ListClientsDto) {
    const companyId = resolveCompanyId(currentUser, query.companyId);
    const where: Prisma.ClientWhereInput = {
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
      this.prisma.client.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(currentUser: AuthenticatedUser, dto: CreateClientDto) {
    const companyId = resolveCompanyId(currentUser, dto.companyId);

    return this.prisma.client.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        type: dto.type,
        document: dto.document,
        address: dto.address,
        companyId,
      },
    });
  }

  async update(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateClientDto,
  ) {
    await this.findScoped(currentUser, id);

    return this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        type: dto.type,
        document: dto.document,
        address: dto.address,
      },
    });
  }

  async setActive(currentUser: AuthenticatedUser, id: string, active: boolean) {
    await this.findScoped(currentUser, id);
    return this.prisma.client.update({ where: { id }, data: { active } });
  }

  private async findScoped(
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<Client> {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client || client.deletedAt) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      client.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return client;
  }
}
