import type {
  AcquirerType,
  ChargeStatus,
  SubscriptionStatus,
} from '@prisma/client';

export interface RecurringPlanInput {
  name: string;
  /** Monthly amount charged after the trial, in BRL. */
  price: number;
  trialDays: number;
}

export interface RecurringPlanResult {
  externalPlanId: string;
}

export interface SubscribeCompanyInput {
  externalPlanId: string;
  payerEmail: string;
  /**
   * Our own Subscription id, sent to the acquirer as its "external
   * reference" so every webhook the acquirer sends back (for this
   * subscription and every charge it generates) can be joined straight
   * back to a Subscription row without depending on the acquirer
   * propagating its own subscription id onto every event.
   */
  externalReference: string;
}

export interface SubscribeCompanyResult {
  externalSubscriptionId: string;
  /** Where the payer completes authorization. */
  checkoutUrl: string;
  status: SubscriptionStatus;
}

export type NormalizedWebhookEvent =
  | {
      kind: 'subscription-status';
      externalReference: string;
      externalSubscriptionId: string;
      status: SubscriptionStatus;
    }
  | {
      kind: 'charge';
      externalReference: string;
      externalChargeId: string;
      status: ChargeStatus;
      amount: number;
      occurredAt: Date;
    }
  | { kind: 'ignored' };

export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  body: unknown;
}

/**
 * One implementation per payment provider. Callers (PlansService,
 * SubscriptionsService) only ever talk to this interface — never to an
 * acquirer's SDK directly — so adding a second provider later means adding
 * a new class here plus an entry in AcquirerRegistryService, nothing else.
 */
export interface PaymentAcquirer {
  readonly type: AcquirerType;
  createRecurringPlan(input: RecurringPlanInput): Promise<RecurringPlanResult>;
  subscribeCompany(
    input: SubscribeCompanyInput,
  ): Promise<SubscribeCompanyResult>;
  cancelSubscription(externalSubscriptionId: string): Promise<void>;
  /**
   * Verifies the request's signature (throwing if invalid) and returns a
   * normalized event. Async because confirming a `charge` event requires an
   * authenticated follow-up call to the acquirer for the full payment
   * details — most acquirers' webhook payloads only carry an id.
   */
  parseWebhook(request: WebhookRequest): Promise<NormalizedWebhookEvent>;
}
