import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, type Client } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreatePublicClientDto } from './dto/create-public-client.dto';
import { ListClientsDto } from './dto/list-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const SALT_ROUNDS = 10;

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

    return {
      data: data.map((client) => this.toSafeClient(client)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async create(currentUser: AuthenticatedUser, dto: CreateClientDto) {
    const companyId = resolveCompanyId(currentUser, dto.companyId);
    const password = dto.password
      ? await this.hashClientPassword(dto.password, dto.email)
      : undefined;

    const client = await this.prisma.client.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        type: dto.type,
        document: dto.document,
        address: dto.address,
        password,
        companyId,
        deletedAt: null,
      },
    });
    return this.toSafeClient(client);
  }

  /**
   * Public self-registration: no authenticated user, so the target
   * company comes straight from the payload — validated here instead of
   * via resolveCompanyId, which assumes a token.
   */
  async registerPublic(dto: CreatePublicClientDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });
    if (!company || company.deletedAt) {
      throw new NotFoundException('Escritório não encontrado.');
    }
    const password = await this.hashClientPassword(dto.password, dto.email);

    const client = await this.prisma.client.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        type: dto.type,
        password,
        companyId: dto.companyId,
        deletedAt: null,
      },
    });
    return this.toSafeClient(client);
  }

  /**
   * Lets the public self-registration form warn the visitor before they
   * fill out the whole form: mirrors hashClientPassword's actual
   * uniqueness check (password-bearing clients only, global — not scoped
   * to companyId, since that's the real constraint a submit would hit).
   */
  async checkPublicEmailExists(email: string): Promise<{ exists: boolean }> {
    const existing = await this.prisma.client.findFirst({
      where: { email, password: { not: null } },
      select: { id: true },
    });
    return { exists: !!existing };
  }

  async update(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateClientDto,
  ) {
    const existing = await this.findScoped(currentUser, id);
    const password = dto.password
      ? await this.hashClientPassword(
          dto.password,
          dto.email ?? existing.email,
          id,
        )
      : undefined;

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        type: dto.type,
        document: dto.document,
        address: dto.address,
        password,
      },
    });
    return this.toSafeClient(client);
  }

  async setActive(currentUser: AuthenticatedUser, id: string, active: boolean) {
    await this.findScoped(currentUser, id);
    const client = await this.prisma.client.update({
      where: { id },
      data: { active },
    });
    return this.toSafeClient(client);
  }

  private toSafeClient(client: Client) {
    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      type: client.type,
      document: client.document,
      address: client.address,
      active: client.active,
      companyId: client.companyId,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  /**
   * email has no @unique on Client — a client can be a denormalized
   * contact record with the same address book entry duplicated by
   * mistake, and that's fine as long as it can't log in. Once a password
   * is set, though, that email must resolve to exactly one client-auth
   * account, so this enforces uniqueness only among password-bearing
   * clients (see client-auth.service.ts's login lookup).
   */
  private async hashClientPassword(
    password: string,
    email: string,
    excludeClientId?: string,
  ): Promise<string> {
    const existing = await this.prisma.client.findFirst({
      where: {
        email,
        password: { not: null },
        ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe um acesso de cliente com este e-mail.',
      );
    }
    return bcrypt.hash(password, SALT_ROUNDS);
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
