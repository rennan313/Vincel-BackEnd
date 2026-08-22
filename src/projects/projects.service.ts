import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole, type Project } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { PlanningPhaseDto } from './dto/planning-phase.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

// PlanningPhaseDto.startDate is an ISO string (validated by @IsDateString);
// the embedded PlanningPhase.startDate is a real DateTime, so each phase
// needs the same string -> Date conversion applied to the top-level dates.
function mapPlanningPhases(phases?: PlanningPhaseDto[]) {
  return phases?.map((phase) => ({
    ...phase,
    startDate: phase.startDate ? new Date(phase.startDate) : undefined,
  }));
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: ListProjectsDto) {
    const companyId = resolveCompanyId(currentUser, query.companyId);
    const where: Prisma.ProjectWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { clientName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(currentUser: AuthenticatedUser, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { providerLinks: { include: { provider: true } } },
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

  async create(currentUser: AuthenticatedUser, dto: CreateProjectDto) {
    const companyId = resolveCompanyId(currentUser, dto.companyId);

    return this.prisma.project.create({
      data: {
        name: dto.name,
        type: dto.type,
        customType: dto.customType,
        areaSqm: dto.areaSqm,
        status: dto.status,
        clientId: dto.clientId,
        clientName: dto.clientName,
        services: dto.services ?? [],
        customServiceLabel: dto.customServiceLabel,
        planningPhases: mapPlanningPhases(dto.planningPhases),
        complexity: dto.complexity,
        constructionBudget: dto.constructionBudget,
        feeModel: dto.feeModel,
        feeRate: dto.feeRate,
        estimatedHours: dto.estimatedHours,
        feeAmount: dto.feeAmount,
        paymentMethod: dto.paymentMethod,
        installments: dto.installments,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        address: dto.address,
        companyId,
        deletedAt: null,
      },
    });
  }

  async update(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateProjectDto,
  ) {
    await this.findScoped(currentUser, id);

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        customType: dto.customType,
        areaSqm: dto.areaSqm,
        status: dto.status,
        clientId: dto.clientId,
        clientName: dto.clientName,
        services: dto.services,
        customServiceLabel: dto.customServiceLabel,
        planningPhases: mapPlanningPhases(dto.planningPhases),
        complexity: dto.complexity,
        constructionBudget: dto.constructionBudget,
        feeModel: dto.feeModel,
        feeRate: dto.feeRate,
        estimatedHours: dto.estimatedHours,
        feeAmount: dto.feeAmount,
        paymentMethod: dto.paymentMethod,
        installments: dto.installments,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        address: dto.address,
      },
    });
  }

  async setActive(currentUser: AuthenticatedUser, id: string, active: boolean) {
    await this.findScoped(currentUser, id);
    return this.prisma.project.update({ where: { id }, data: { active } });
  }

  async remove(currentUser: AuthenticatedUser, id: string) {
    await this.findScoped(currentUser, id);
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findScoped(
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
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
}
