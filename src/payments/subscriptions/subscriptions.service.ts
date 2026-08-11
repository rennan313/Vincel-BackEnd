import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AcquirerType,
  ChargeStatus,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveCompanyId } from '../../common/company-scope';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AcquirerRegistryService } from '../acquirers/acquirer-registry.service';
import type {
  NormalizedWebhookEvent,
  WebhookRequest,
} from '../acquirers/payment-acquirer.interface';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acquirers: AcquirerRegistryService,
  ) {}

  findMine(currentUser: AuthenticatedUser, requestedCompanyId?: string) {
    const companyId = resolveCompanyId(currentUser, requestedCompanyId);
    return this.prisma.subscription.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  async create(currentUser: AuthenticatedUser, dto: CreateSubscriptionDto) {
    const companyId = resolveCompanyId(currentUser, dto.companyId);

    const existing = await this.prisma.subscription.findFirst({
      where: { companyId, status: { not: SubscriptionStatus.CANCELED } },
    });
    // A subscription with no acquirer yet is just the free signup trial
    // (see AuthService) — checking out reuses that same row instead of
    // creating a second one. Anything past that point (acquirer already
    // set) is a real conflict: the company already checked out before.
    if (existing && existing.acquirer) {
      throw new ConflictException(
        'Este escritório já tem uma assinatura em andamento.',
      );
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || plan.deletedAt || !plan.active) {
      throw new NotFoundException('Plano não encontrado.');
    }

    const acquirerType = this.resolveAcquirer(dto.acquirer);
    const acquirerRef = plan.acquirerRefs.find(
      (ref) => ref.acquirer === acquirerType,
    );
    if (!acquirerRef) {
      throw new BadRequestException(
        'Este plano ainda não foi sincronizado com o adquirente escolhido.',
      );
    }

    // Created (or reused from the signup trial) before calling the acquirer
    // so its id can be sent as the external_reference — every webhook this
    // subscription (or a charge it generates) triggers gets joined straight
    // back to this row.
    const subscription = existing
      ? await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            planId: plan.id,
            trialEndsAt:
              plan.trialDays > 0
                ? addDays(new Date(), plan.trialDays)
                : existing.trialEndsAt,
          },
        })
      : await this.prisma.subscription.create({
          data: {
            companyId,
            planId: plan.id,
            status: SubscriptionStatus.PENDING,
            trialEndsAt:
              plan.trialDays > 0 ? addDays(new Date(), plan.trialDays) : null,
          },
        });

    const result = await this.acquirers.get(acquirerType).subscribeCompany({
      externalPlanId: acquirerRef.externalPlanId,
      payerEmail: currentUser.email,
      externalReference: subscription.id,
    });

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        acquirer: acquirerType,
        externalSubscriptionId: result.externalSubscriptionId,
        checkoutUrl: result.checkoutUrl,
        status: result.status,
      },
    });
  }

  async cancel(currentUser: AuthenticatedUser, id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });
    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada.');
    }
    if (
      currentUser.role !== UserRole.VINCEL_ADMIN &&
      subscription.companyId !== currentUser.companyId
    ) {
      throw new ForbiddenException(
        'Assinatura não pertence ao seu escritório.',
      );
    }
    if (subscription.status === SubscriptionStatus.CANCELED) {
      return subscription;
    }

    if (subscription.externalSubscriptionId && subscription.acquirer) {
      await this.acquirers
        .get(subscription.acquirer)
        .cancelSubscription(subscription.externalSubscriptionId);
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
    });
  }

  async handleWebhook(acquirerType: AcquirerType, request: WebhookRequest) {
    const event = await this.acquirers.get(acquirerType).parseWebhook(request);
    await this.applyEvent(event);
    return { received: true };
  }

  private async applyEvent(event: NormalizedWebhookEvent) {
    if (event.kind === 'ignored') return;

    // externalReference is always our own Subscription id (set at creation
    // time) — never a value we need to trust beyond using it as a lookup key.
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: event.externalReference },
    });
    // No acquirer means it's still just the local signup trial — the
    // acquirer can't have sent a webhook about a subscription it doesn't
    // know exists yet.
    if (!subscription || !subscription.acquirer) return;

    if (event.kind === 'subscription-status') {
      const status = resolveTrialAwareStatus(
        event.status,
        subscription.trialEndsAt,
      );
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          externalSubscriptionId: event.externalSubscriptionId,
          status,
          ...(status === SubscriptionStatus.CANCELED
            ? { canceledAt: new Date() }
            : {}),
        },
      });
      return;
    }

    await this.prisma.paymentCharge.upsert({
      where: {
        acquirer_externalId: {
          acquirer: subscription.acquirer,
          externalId: event.externalChargeId,
        },
      },
      create: {
        subscriptionId: subscription.id,
        acquirer: subscription.acquirer,
        externalId: event.externalChargeId,
        status: event.status,
        amount: event.amount,
        occurredAt: event.occurredAt,
      },
      update: { status: event.status },
    });

    // No enforcement (no blocking) yet — this only keeps the recorded status
    // truthful so a future enforcement pass has something correct to read.
    if (
      event.status === ChargeStatus.APPROVED &&
      subscription.status === SubscriptionStatus.PAST_DUE
    ) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    } else if (
      event.status === ChargeStatus.REJECTED &&
      (subscription.status === SubscriptionStatus.ACTIVE ||
        subscription.status === SubscriptionStatus.TRIALING)
    ) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
    }
  }

  private resolveAcquirer(requested?: AcquirerType): AcquirerType {
    if (requested) {
      if (!this.acquirers.isEnabled(requested)) {
        throw new BadRequestException('Adquirente indisponível no momento.');
      }
      return requested;
    }
    const enabled = this.acquirers.listEnabled();
    if (enabled.length === 0) {
      throw new BadRequestException('Nenhum adquirente habilitado no momento.');
    }
    if (enabled.length > 1) {
      throw new BadRequestException(
        'Mais de um adquirente habilitado — informe qual usar.',
      );
    }
    return enabled[0];
  }
}

// MercadoPago's preapproval "authorized" status (-> our ACTIVE) doesn't
// distinguish trial from post-trial — we derive TRIALING locally from the
// plan's trialDays captured on the subscription at creation time.
function resolveTrialAwareStatus(
  status: SubscriptionStatus,
  trialEndsAt: Date | null,
): SubscriptionStatus {
  if (
    status === SubscriptionStatus.ACTIVE &&
    trialEndsAt &&
    trialEndsAt > new Date()
  ) {
    return SubscriptionStatus.TRIALING;
  }
  return status;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
