import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProjectMaterialStatus,
  UserRole,
  type Project,
  type ProjectMaterial,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type { AuthenticatedClient } from '../client-auth/strategies/client-jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

// Explicit select for the client portal — never the office's own cost
// basis (unitCost/totalCost/supplier) or the internal catalog link
// (productId), same principle as ClientAuthService.myProjects hiding
// honorários/orçamento/parcelas from the client.
const CLIENT_MATERIAL_SELECT = {
  id: true,
  name: true,
  category: true,
  room: true,
  status: true,
  quantity: true,
  unit: true,
  brand: true,
  model: true,
  thickness: true,
  dimension: true,
  finish: true,
  color: true,
  image: true,
  referenceUrl: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ProjectMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, projectId: string) {
    await this.assertProjectScoped(currentUser, projectId);
    return this.prisma.projectMaterial.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    currentUser: AuthenticatedUser,
    projectId: string,
    dto: CreateMaterialDto,
  ) {
    await this.assertProjectScoped(currentUser, projectId);
    return this.prisma.projectMaterial.create({
      data: { ...dto, projectId },
    });
  }

  async update(
    currentUser: AuthenticatedUser,
    projectId: string,
    materialId: string,
    dto: UpdateMaterialDto,
  ) {
    await this.assertMaterialScoped(currentUser, projectId, materialId);
    return this.prisma.projectMaterial.update({
      where: { id: materialId },
      data: dto,
    });
  }

  async remove(
    currentUser: AuthenticatedUser,
    projectId: string,
    materialId: string,
  ) {
    await this.assertMaterialScoped(currentUser, projectId, materialId);
    await this.prisma.projectMaterial.delete({ where: { id: materialId } });
  }

  /** The client portal's read of its own linked project's materials — an
   * explicit safe select, never the raw document (see CLIENT_MATERIAL_SELECT). */
  async listForClient(currentClient: AuthenticatedClient, projectId: string) {
    await this.assertProjectScopedToClient(currentClient, projectId);
    return this.prisma.projectMaterial.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: CLIENT_MATERIAL_SELECT,
    });
  }

  /**
   * The client's only write on a material: approving one the escritório
   * has specified. Only a material currently ESPECIFICADO can move to
   * APROVADO this way — the client never sets A_DEFINIR or COMPRADO,
   * those stay the escritório's own call (see UpdateMaterialDto for that).
   */
  async approveForClient(
    currentClient: AuthenticatedClient,
    projectId: string,
    materialId: string,
  ) {
    await this.assertProjectScopedToClient(currentClient, projectId);
    const material = await this.prisma.projectMaterial.findUnique({
      where: { id: materialId },
    });
    if (!material || material.projectId !== projectId) {
      throw new NotFoundException('Material não encontrado neste projeto.');
    }
    if (material.status !== ProjectMaterialStatus.ESPECIFICADO) {
      throw new BadRequestException(
        'Este material não está aguardando aprovação.',
      );
    }
    return this.prisma.projectMaterial.update({
      where: { id: materialId },
      data: { status: ProjectMaterialStatus.APROVADO },
      select: CLIENT_MATERIAL_SELECT,
    });
  }

  private async assertProjectScopedToClient(
    currentClient: AuthenticatedClient,
    projectId: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (
      !project ||
      project.deletedAt ||
      project.clientId !== currentClient.id ||
      project.companyId !== currentClient.companyId
    ) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    return project;
  }

  private async assertProjectScoped(
    currentUser: AuthenticatedUser,
    projectId: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
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

  private async assertMaterialScoped(
    currentUser: AuthenticatedUser,
    projectId: string,
    materialId: string,
  ): Promise<ProjectMaterial> {
    await this.assertProjectScoped(currentUser, projectId);
    const material = await this.prisma.projectMaterial.findUnique({
      where: { id: materialId },
    });
    if (!material || material.projectId !== projectId) {
      throw new NotFoundException('Material não encontrado neste projeto.');
    }
    return material;
  }
}
