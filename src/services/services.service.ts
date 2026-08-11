import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesDto } from './dto/list-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListServicesDto) {
    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.service.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  create(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: { name: dto.name, deletedAt: null },
    });
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findScoped(id);
    return this.prisma.service.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async setActive(id: string, active: boolean) {
    await this.findScoped(id);
    return this.prisma.service.update({ where: { id }, data: { active } });
  }

  async remove(id: string) {
    await this.findScoped(id);
    await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findScoped(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service || service.deletedAt) {
      throw new NotFoundException('Serviço não encontrado.');
    }
    return service;
  }
}
