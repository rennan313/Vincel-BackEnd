import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProviderStatus,
  UserRole,
  type Project,
  type ProjectProvider,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { AssignProviderDto } from './dto/assign-provider.dto';
import { UpdateProjectProviderDto } from './dto/update-project-provider.dto';

@Injectable()
export class ProjectProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, projectId: string) {
    await this.assertProjectScoped(currentUser, projectId);
    return this.prisma.projectProvider.findMany({
      where: { projectId },
      include: { provider: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    currentUser: AuthenticatedUser,
    projectId: string,
    dto: AssignProviderDto,
  ) {
    const project = await this.assertProjectScoped(currentUser, projectId);

    const providerId = dto.providerId
      ? await this.resolveExistingProvider(dto.providerId, project.companyId)
      : await this.createProvider(dto, project.companyId);

    const existingLink = await this.prisma.projectProvider.findFirst({
      where: { projectId, providerId },
    });
    if (existingLink) {
      throw new ConflictException('Esse prestador já está vinculado a este projeto.');
    }

    return this.prisma.projectProvider.create({
      data: {
        projectId,
        providerId,
        status: dto.status ?? ProviderStatus.A_CONTRATAR,
        responsibility: dto.responsibility,
      },
      include: { provider: true },
    });
  }

  private async resolveExistingProvider(
    providerId: string,
    companyId: string,
  ): Promise<string> {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider || provider.deletedAt || provider.companyId !== companyId) {
      throw new NotFoundException('Prestador não encontrado.');
    }
    return provider.id;
  }

  private async createProvider(
    dto: AssignProviderDto,
    companyId: string,
  ): Promise<string> {
    if (!dto.name?.trim() || !dto.role) {
      throw new BadRequestException(
        'Informe o nome e a participação do novo prestador.',
      );
    }

    const provider = await this.prisma.provider.create({
      data: {
        name: dto.name,
        role: dto.role,
        customRole: dto.customRole,
        phone: dto.phone,
        email: dto.email,
        companyName: dto.companyName,
        document: dto.document,
        companyId,
        deletedAt: null,
      },
    });
    return provider.id;
  }

  async update(
    currentUser: AuthenticatedUser,
    projectId: string,
    linkId: string,
    dto: UpdateProjectProviderDto,
  ) {
    const link = await this.assertLinkScoped(currentUser, projectId, linkId);

    await this.prisma.provider.update({
      where: { id: link.providerId },
      data: {
        name: dto.name,
        role: dto.role,
        customRole: dto.customRole,
        phone: dto.phone,
        email: dto.email,
        companyName: dto.companyName,
        document: dto.document,
      },
    });

    return this.prisma.projectProvider.update({
      where: { id: linkId },
      data: {
        status: dto.status,
        responsibility: dto.responsibility,
      },
      include: { provider: true },
    });
  }

  async remove(currentUser: AuthenticatedUser, projectId: string, linkId: string) {
    await this.assertLinkScoped(currentUser, projectId, linkId);
    await this.prisma.projectProvider.delete({ where: { id: linkId } });
  }

  private async assertProjectScoped(
    currentUser: AuthenticatedUser,
    projectId: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.deletedAt) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      project.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    return project;
  }

  private async assertLinkScoped(
    currentUser: AuthenticatedUser,
    projectId: string,
    linkId: string,
  ): Promise<ProjectProvider> {
    await this.assertProjectScoped(currentUser, projectId);
    const link = await this.prisma.projectProvider.findUnique({ where: { id: linkId } });
    if (!link || link.projectId !== projectId) {
      throw new NotFoundException('Prestador não encontrado neste projeto.');
    }
    return link;
  }
}
