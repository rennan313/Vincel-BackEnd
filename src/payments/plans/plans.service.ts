import { Injectable, NotFoundException } from '@nestjs/common';
import { type Plan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AcquirerRegistryService } from '../acquirers/acquirer-registry.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acquirers: AcquirerRegistryService,
  ) {}

  list() {
    return this.prisma.plan.findMany({
      where: { deletedAt: null },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.findScoped(id);
  }

  async create(dto: CreatePlanDto) {
    if (dto.isDefault) {
      await this.clearOtherDefaults();
    }

    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        trialDays: dto.trialDays ?? 0,
        isDefault: dto.isDefault ?? false,
      },
    });

    // Sync the new plan to every currently-enabled acquirer so it's
    // immediately subscribable. If no acquirer is enabled the plan is just
    // created with no acquirerRefs — nothing to subscribe to until one is.
    const acquirerRefs = await Promise.all(
      this.acquirers.listEnabled().map(async (acquirer) => {
        const { externalPlanId } = await this.acquirers
          .get(acquirer)
          .createRecurringPlan({
            name: plan.name,
            price: plan.price,
            trialDays: plan.trialDays,
          });
        return { acquirer, externalPlanId };
      }),
    );

    if (acquirerRefs.length === 0) return plan;
    return this.prisma.plan.update({
      where: { id: plan.id },
      data: { acquirerRefs },
    });
  }

  // Local-only: price/trial edits are not pushed back to already-synced
  // acquirers. Out of scope for now — revisit once a plan needs to change
  // after it has live subscribers.
  async update(id: string, dto: UpdatePlanDto) {
    await this.findScoped(id);
    if (dto.isDefault) {
      await this.clearOtherDefaults(id);
    }
    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  async setActive(id: string, active: boolean) {
    await this.findScoped(id);
    return this.prisma.plan.update({ where: { id }, data: { active } });
  }

  async remove(id: string) {
    await this.findScoped(id);
    await this.prisma.plan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findScoped(id: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan || plan.deletedAt) {
      throw new NotFoundException('Plano não encontrado.');
    }
    return plan;
  }

  // At most one plan is default at a time — enforced here, not by a DB
  // constraint (see the isDefault comment on the Plan model).
  private async clearOtherDefaults(exceptId?: string): Promise<void> {
    await this.prisma.plan.updateMany({
      where: {
        isDefault: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }
}
