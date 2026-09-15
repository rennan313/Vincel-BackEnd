import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type ScheduleStatusCategory } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { resolveCompanyId } from '../common/company-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleStatusCategoryDto } from './dto/create-schedule-status-category.dto';
import { UpdateScheduleStatusCategoryDto } from './dto/update-schedule-status-category.dto';

/** Seeded the first time a company asks for its categories — a starting
 * point matching the colors already used elsewhere for status (green/
 * amber/red), never touched again once the escritório edits its own. */
const DEFAULT_CATEGORIES: CreateScheduleStatusCategoryDto[] = [
  { label: 'No prazo', color: '#22c55e', thresholdDays: 0 },
  { label: 'Atenção', color: '#f59e0b', thresholdDays: 1 },
  { label: 'Atrasado', color: '#ef4444', thresholdDays: 8 },
];

@Injectable()
export class ScheduleStatusCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    currentUser: AuthenticatedUser,
  ): Promise<ScheduleStatusCategory[]> {
    const companyId = resolveCompanyId(currentUser);
    const existing = await this.prisma.scheduleStatusCategory.findMany({
      where: { companyId },
      orderBy: { thresholdDays: 'asc' },
    });
    if (existing.length > 0) {
      return existing;
    }

    await this.prisma.scheduleStatusCategory.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({ ...category, companyId })),
    });
    return this.prisma.scheduleStatusCategory.findMany({
      where: { companyId },
      orderBy: { thresholdDays: 'asc' },
    });
  }

  async create(
    currentUser: AuthenticatedUser,
    dto: CreateScheduleStatusCategoryDto,
  ) {
    const companyId = resolveCompanyId(currentUser);
    return this.prisma.scheduleStatusCategory.create({
      data: { ...dto, companyId },
    });
  }

  async update(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateScheduleStatusCategoryDto,
  ) {
    await this.findScoped(currentUser, id);
    return this.prisma.scheduleStatusCategory.update({
      where: { id },
      data: dto,
    });
  }

  async remove(currentUser: AuthenticatedUser, id: string) {
    await this.findScoped(currentUser, id);
    await this.prisma.scheduleStatusCategory.delete({ where: { id } });
  }

  private async findScoped(currentUser: AuthenticatedUser, id: string) {
    const category = await this.prisma.scheduleStatusCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      category.companyId !== currentUser.companyId
    ) {
      throw new NotFoundException('Categoria não encontrada.');
    }
    return category;
  }
}
