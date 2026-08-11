import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListSuppliersDto) {
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: { name: dto.name, deletedAt: null },
    });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findScoped(id);
    return this.prisma.supplier.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async setActive(id: string, active: boolean) {
    await this.findScoped(id);
    return this.prisma.supplier.update({ where: { id }, data: { active } });
  }

  async remove(id: string) {
    await this.findScoped(id);
    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findScoped(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });
    if (!supplier || supplier.deletedAt) {
      throw new NotFoundException('Fornecedor não encontrado.');
    }
    return supplier;
  }
}
