import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, type Product } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceDto } from './dto/create-price.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListPricesDto } from './dto/list-prices.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: ListProductsDto) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...this.resolveVisibility(currentUser, query.companyId),
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

  async findOne(currentUser: AuthenticatedUser, id: string) {
    return this.findScoped(currentUser, id);
  }

  create(currentUser: AuthenticatedUser, dto: CreateProductDto) {
    const companyId = this.resolveWriteCompanyId(currentUser, dto.companyId);

    return this.prisma.product.create({
      data: { ...dto, companyId, deletedAt: null },
    });
  }

  async update(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateProductDto,
  ) {
    await this.findScoped(currentUser, id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async setActive(currentUser: AuthenticatedUser, id: string, active: boolean) {
    await this.findScoped(currentUser, id);
    return this.prisma.product.update({ where: { id }, data: { active } });
  }

  async remove(currentUser: AuthenticatedUser, id: string) {
    await this.findScoped(currentUser, id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listPrices(
    currentUser: AuthenticatedUser,
    productId: string,
    query: ListPricesDto,
  ) {
    await this.findScoped(currentUser, productId);
    return this.prisma.price.findMany({
      where: {
        productId,
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      },
      orderBy: { validFrom: 'desc' },
    });
  }

  async createPrice(
    currentUser: AuthenticatedUser,
    productId: string,
    dto: CreatePriceDto,
  ) {
    await this.findScoped(currentUser, productId);
    return this.prisma.price.create({
      data: {
        productId,
        supplierId: dto.supplierId,
        price: dto.price,
      },
    });
  }

  /** Read visibility: a regular user only sees their own escritório's
   * private catalog — the global catalog (companyId null) is stored but
   * not yet surfaced there. VINCEL_ADMIN sees the global catalog by
   * default, or a specific escritório's private catalog when asked. */
  private resolveVisibility(
    currentUser: AuthenticatedUser,
    queryCompanyId?: string,
  ): Prisma.ProductWhereInput {
    if (currentUser.role === UserRole.VINCEL_ADMIN) {
      return { companyId: queryCompanyId ?? null };
    }
    if (!currentUser.companyId) {
      throw new ForbiddenException('Usuário sem escritório associado.');
    }
    return { companyId: currentUser.companyId };
  }

  /** Write scope for create(): VINCEL_ADMIN may omit companyId to cadastrar
   * straight into the global catalog, or pass one to cadastrar on behalf of
   * a specific escritório. Every other user always cadastra into their own
   * escritório — any companyId they send is ignored. */
  private resolveWriteCompanyId(
    currentUser: AuthenticatedUser,
    requestedCompanyId?: string,
  ): string | undefined {
    if (currentUser.role === UserRole.VINCEL_ADMIN) {
      return requestedCompanyId;
    }
    if (!currentUser.companyId) {
      throw new ForbiddenException('Usuário sem escritório associado.');
    }
    return currentUser.companyId;
  }

  private async findScoped(
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Produto não encontrado.');
    }
    if (currentUser.role === UserRole.VINCEL_ADMIN) {
      return product;
    }
    // A global product (companyId null) is VINCEL_ADMIN-only; a private one
    // is only visible/editable by its own escritório.
    if (!product.companyId || product.companyId !== currentUser.companyId) {
      throw new NotFoundException('Produto não encontrado.');
    }
    return product;
  }
}
