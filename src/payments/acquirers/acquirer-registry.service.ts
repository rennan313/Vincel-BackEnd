import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcquirerType } from '@prisma/client';
import type { PaymentAcquirer } from './payment-acquirer.interface';
import { MercadoPagoAcquirer } from './mercado-pago.acquirer';

// Config key (ENABLED_ACQUIRERS, comma-separated) -> Prisma enum value.
// Add an entry here plus a new PaymentAcquirer implementation, registered in
// the constructor below, to plug in another provider.
const ACQUIRER_KEYS: Record<string, AcquirerType> = {
  'mercado-pago': AcquirerType.MERCADO_PAGO,
};

@Injectable()
export class AcquirerRegistryService {
  private readonly acquirers: Map<AcquirerType, PaymentAcquirer>;
  private readonly enabled: Set<AcquirerType>;

  constructor(config: ConfigService, mercadoPago: MercadoPagoAcquirer) {
    this.acquirers = new Map([[AcquirerType.MERCADO_PAGO, mercadoPago]]);

    const configuredKeys = (config.get<string>('ENABLED_ACQUIRERS') ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);
    this.enabled = new Set(
      configuredKeys
        .map((key) => ACQUIRER_KEYS[key])
        .filter((type): type is AcquirerType => Boolean(type)),
    );
  }

  /** Whether new subscriptions may be started through this acquirer. */
  isEnabled(type: AcquirerType): boolean {
    return this.enabled.has(type);
  }

  listEnabled(): AcquirerType[] {
    return [...this.enabled];
  }

  /**
   * Looks up the adapter regardless of whether the acquirer is currently
   * enabled — webhooks and cancellations for an existing subscription must
   * keep working even after that acquirer is turned off for new signups.
   * Callers that start a *new* subscription should check isEnabled() first.
   */
  get(type: AcquirerType): PaymentAcquirer {
    const acquirer = this.acquirers.get(type);
    if (!acquirer) {
      throw new InternalServerErrorException(
        `Adquirente ${type} não implementado.`,
      );
    }
    return acquirer;
  }
}
