import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser) {
    const companyId = resolveCompanyId(currentUser);
    return this.prisma.projectRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
  }

  async markRead(currentUser: AuthenticatedUser, id: string) {
    const companyId = resolveCompanyId(currentUser);
    const request = await this.prisma.projectRequest.findUnique({
      where: { id },
    });
    if (
      !request ||
      (currentUser.role !== UserRole.VINCEL_ADMIN &&
        request.companyId !== companyId)
    ) {
      throw new NotFoundException('Solicitação não encontrada.');
    }
    return this.prisma.projectRequest.update({
      where: { id },
      data: { status: 'read' },
    });
  }
}
