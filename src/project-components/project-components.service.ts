import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectComponentDto } from './dto/create-project-component.dto';
import { ListProjectComponentsDto } from './dto/list-project-components.dto';
import { UpdateProjectComponentDto } from './dto/update-project-component.dto';

@Injectable()
export class ProjectComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProjectComponentsDto) {
    const where: Prisma.ProjectComponentWhereInput = {
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.mostUsed !== undefined ? { mostUsed: query.mostUsed } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.projectComponent.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.projectComponent.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  create(dto: CreateProjectComponentDto) {
    return this.prisma.projectComponent.create({
      data: {
        name: dto.name,
        category: dto.category,
        mostUsed: dto.mostUsed ?? false,
        deletedAt: null,
      },
    });
  }

  async update(id: string, dto: UpdateProjectComponentDto) {
    await this.findScoped(id);
    return this.prisma.projectComponent.update({
      where: { id },
      data: { name: dto.name, category: dto.category, mostUsed: dto.mostUsed },
    });
  }

  async setActive(id: string, active: boolean) {
    await this.findScoped(id);
    return this.prisma.projectComponent.update({
      where: { id },
      data: { active },
    });
  }

  async remove(id: string) {
    await this.findScoped(id);
    await this.prisma.projectComponent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findScoped(id: string) {
    const component = await this.prisma.projectComponent.findUnique({
      where: { id },
    });
    if (!component || component.deletedAt) {
      throw new NotFoundException('Componente não encontrado.');
    }
    return component;
  }
}
