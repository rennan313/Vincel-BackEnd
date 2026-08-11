import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectTypeDto } from './dto/create-project-type.dto';
import { ListProjectTypesDto } from './dto/list-project-types.dto';
import { UpdateProjectTypeDto } from './dto/update-project-type.dto';

@Injectable()
export class ProjectTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProjectTypesDto) {
    const where: Prisma.ProjectTypeWhereInput = {
      deletedAt: null,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.projectType.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.projectType.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  create(dto: CreateProjectTypeDto) {
    return this.prisma.projectType.create({
      data: { name: dto.name, icon: dto.icon, deletedAt: null },
    });
  }

  async update(id: string, dto: UpdateProjectTypeDto) {
    await this.findScoped(id);
    return this.prisma.projectType.update({
      where: { id },
      data: { name: dto.name, icon: dto.icon },
    });
  }

  async setActive(id: string, active: boolean) {
    await this.findScoped(id);
    return this.prisma.projectType.update({ where: { id }, data: { active } });
  }

  async remove(id: string) {
    await this.findScoped(id);
    await this.prisma.projectType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findScoped(id: string) {
    const projectType = await this.prisma.projectType.findUnique({
      where: { id },
    });
    if (!projectType || projectType.deletedAt) {
      throw new NotFoundException('Tipo de projeto não encontrado.');
    }
    return projectType;
  }
}
