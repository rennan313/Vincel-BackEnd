import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceDto } from './dto/create-price.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListPricesDto } from './dto/list-prices.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsDto) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string) {
    return this.findScoped(id);
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { ...dto, deletedAt: null },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findScoped(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async setActive(id: string, active: boolean) {
    await this.findScoped(id);
    return this.prisma.product.update({ where: { id }, data: { active } });
  }

  async remove(id: string) {
    await this.findScoped(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listPrices(productId: string, query: ListPricesDto) {
    await this.findScoped(productId);
    return this.prisma.price.findMany({
      where: {
        productId,
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      },
      orderBy: { validFrom: 'desc' },
    });
  }

  async createPrice(productId: string, dto: CreatePriceDto) {
    await this.findScoped(productId);
    return this.prisma.price.create({
      data: {
        productId,
        supplierId: dto.supplierId,
        price: dto.price,
      },
    });
  }

  private async findScoped(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Produto não encontrado.');
    }
    return product;
  }
}
