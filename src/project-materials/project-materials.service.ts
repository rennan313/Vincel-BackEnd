import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type Project, type ProjectMaterial } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

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
