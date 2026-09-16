import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Client } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ClientLoginDto } from './dto/client-login.dto';
import { UpdateClientPasswordDto } from './dto/update-client-password.dto';
import type { AuthenticatedClient } from './strategies/client-jwt.strategy';

// No refresh token for this "weak" portal token — it's meant for reading
// a client's own project/cadastro and changing their password, not for a
// long always-open session, so a single longer-lived access token (no
// silent-renew infrastructure) is enough for now.
const CLIENT_TOKEN_TTL = '7d';

@Injectable()
export class ClientAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: ClientLoginDto) {
    // email has no @unique on Client (see schema) — a login only makes
    // sense among clients that actually have a password set, so that's
    // the set this looks the email up against. findFirst, not
    // findUnique: two different clients (different companies) could in
    // principle share an email; the first match wins. Good enough for
    // now — flagged in the PR description as a known limitation.
    const client = await this.prisma.client.findFirst({
      where: { email: dto.email, password: { not: null } },
    });

    // Same generic message regardless of which check failed — never
    // confirm whether the e-mail exists at all.
    const invalidCredentials = () =>
      new UnauthorizedException('E-mail ou senha inválidos.');

    if (!client || !client.password) {
      throw invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(dto.password, client.password);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    if (!client.active || client.deletedAt) {
      throw new UnauthorizedException(
        'Este acesso foi desativado. Fale com o escritório responsável.',
      );
    }

    const accessToken = await this.jwt.signAsync(
      { sub: client.id, companyId: client.companyId, type: 'client' },
      { expiresIn: CLIENT_TOKEN_TTL },
    );

    return { accessToken, client: this.toSafeClient(client) };
  }

  async me(currentClient: AuthenticatedClient) {
    const client = await this.findActive(currentClient);
    return this.toSafeClient(client);
  }

  async myProjects(currentClient: AuthenticatedClient) {
    await this.findActive(currentClient);
    // Explicit select, not the raw document — a client never sees the
    // office's own business terms for the job (honorários, orçamento,
    // parcelas, forma de pagamento), only their own schedule/progress.
    return this.prisma.project.findMany({
      where: {
        clientId: currentClient.id,
        companyId: currentClient.companyId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        customType: true,
        areaSqm: true,
        status: true,
        complexity: true,
        planningPhases: true,
        startDate: true,
        endDate: true,
        scheduleStatusCategoryId: true,
        address: true,
        createdAt: true,
      },
    });
  }

  async updatePassword(
    currentClient: AuthenticatedClient,
    dto: UpdateClientPasswordDto,
  ) {
    const client = await this.findActive(currentClient);
    if (!client.password) {
      throw new UnauthorizedException('Este acesso não tem senha configurada.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      client.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.client.update({
      where: { id: client.id },
      data: { password: passwordHash },
    });
  }

  private async findActive(currentClient: AuthenticatedClient) {
    const client = await this.prisma.client.findUnique({
      where: { id: currentClient.id },
    });
    if (
      !client ||
      client.deletedAt ||
      !client.active ||
      client.companyId !== currentClient.companyId
    ) {
      throw new UnauthorizedException();
    }
    return client;
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
}
