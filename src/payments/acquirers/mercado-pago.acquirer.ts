import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MercadoPagoConfig,
  PreApproval,
  PreApprovalPlan,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from 'mercadopago';
import { AcquirerType, ChargeStatus, SubscriptionStatus } from '@prisma/client';
import type {
  PaymentAcquirer,
  RecurringPlanInput,
  RecurringPlanResult,
  SubscribeCompanyInput,
  SubscribeCompanyResult,
  NormalizedWebhookEvent,
  WebhookRequest,
} from './payment-acquirer.interface';

interface MercadoPagoWebhookBody {
  type?: string;
  data?: { id?: string };
}

function isWebhookBody(value: unknown): value is MercadoPagoWebhookBody {
  return typeof value === 'object' && value !== null;
}

function firstValue(
  value: string | string[] | undefined | null,
): string | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

// Mercado Pago's own preapproval status vocabulary, normalized to ours.
// `pending` covers both "checkout not completed" and "payer paused" — MP
// doesn't distinguish those in the preapproval status itself; only a failed
// charge webhook (handled separately, as a `charge` event) tells PAST_DUE apart.
function normalizeSubscriptionStatus(
  raw: string | undefined,
): SubscriptionStatus {
  switch (raw) {
    case 'authorized':
      return SubscriptionStatus.ACTIVE;
    case 'cancelled':
      return SubscriptionStatus.CANCELED;
    case 'pending':
    case 'paused':
    default:
      return SubscriptionStatus.PENDING;
  }
}

function normalizeChargeStatus(raw: string | undefined): ChargeStatus {
  switch (raw) {
    case 'approved':
      return ChargeStatus.APPROVED;
    case 'rejected':
    case 'cancelled':
      return ChargeStatus.REJECTED;
    case 'refunded':
    case 'charged_back':
      return ChargeStatus.REFUNDED;
    default:
      return ChargeStatus.PENDING;
  }
}

@Injectable()
export class MercadoPagoAcquirer implements PaymentAcquirer {
  readonly type = AcquirerType.MERCADO_PAGO;

  private readonly preApprovalPlan: PreApprovalPlan;
  private readonly preApproval: PreApproval;
  private readonly payment: Payment;
  private readonly backUrl: string;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const client = new MercadoPagoConfig({
      accessToken: config.get<string>('MERCADOPAGO_ACCESS_TOKEN') ?? '',
    });
    this.preApprovalPlan = new PreApprovalPlan(client);
    this.preApproval = new PreApproval(client);
    this.payment = new Payment(client);
    this.backUrl = config.get<string>('MERCADOPAGO_BACK_URL') ?? '';
    this.webhookSecret = config.get<string>('MERCADOPAGO_WEBHOOK_SECRET') ?? '';
  }

  async createRecurringPlan(
    input: RecurringPlanInput,
  ): Promise<RecurringPlanResult> {
    const response = await this.preApprovalPlan.create({
      body: {
        reason: input.name,
        back_url: this.backUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: input.price,
          currency_id: 'BRL',
          ...(input.trialDays > 0
            ? {
                free_trial: {
                  frequency: input.trialDays,
                  frequency_type: 'days',
                },
              }
            : {}),
        },
      },
    });
    if (!response.id) {
      throw new InternalServerErrorException(
        'Mercado Pago não retornou o id do plano.',
      );
    }
    return { externalPlanId: response.id };
  }

  async subscribeCompany(
    input: SubscribeCompanyInput,
  ): Promise<SubscribeCompanyResult> {
    const response = await this.preApproval.create({
      body: {
        preapproval_plan_id: input.externalPlanId,
        payer_email: input.payerEmail,
        external_reference: input.externalReference,
        back_url: this.backUrl,
      },
    });
    if (!response.id || !response.init_point) {
      throw new InternalServerErrorException(
        'Mercado Pago não retornou os dados da assinatura.',
      );
    }
    return {
      externalSubscriptionId: response.id,
      checkoutUrl: response.init_point,
      status: normalizeSubscriptionStatus(response.status),
    };
  }

  async cancelSubscription(externalSubscriptionId: string): Promise<void> {
    await this.preApproval.update({
      id: externalSubscriptionId,
      body: { status: 'cancelled' },
    });
  }

  async parseWebhook(request: WebhookRequest): Promise<NormalizedWebhookEvent> {
    const body = isWebhookBody(request.body) ? request.body : {};
    const dataId =
      body.data?.id ??
      firstValue(request.query['data.id'] as string | string[] | undefined);

    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers['x-signature'],
        xRequestId: request.headers['x-request-id'],
        dataId,
        secret: this.webhookSecret,
        toleranceSeconds: 300,
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        throw new UnauthorizedException(
          `Assinatura do webhook inválida: ${error.reason}`,
        );
      }
      throw error;
    }

    if (!dataId) return { kind: 'ignored' };

    if (body.type === 'subscription_preapproval') {
      const subscription = await this.preApproval.get({ id: dataId });
      if (!subscription.external_reference || !subscription.id) {
        return { kind: 'ignored' };
      }
      return {
        kind: 'subscription-status',
        externalReference: subscription.external_reference,
        externalSubscriptionId: subscription.id,
        status: normalizeSubscriptionStatus(subscription.status),
      };
    }

    if (body.type === 'payment') {
      const paymentResult = await this.payment.get({ id: dataId });
      if (
        !paymentResult.external_reference ||
        paymentResult.transaction_amount == null
      ) {
        return { kind: 'ignored' };
      }
      return {
        kind: 'charge',
        externalReference: paymentResult.external_reference,
        externalChargeId: String(paymentResult.id),
        status: normalizeChargeStatus(paymentResult.status),
        amount: paymentResult.transaction_amount,
        occurredAt: new Date(
          paymentResult.date_approved ??
            paymentResult.date_created ??
            Date.now(),
        ),
      };
    }

    return { kind: 'ignored' };
  }
}
