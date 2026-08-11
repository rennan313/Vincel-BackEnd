import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AcquirerRegistryService } from './acquirers/acquirer-registry.service';
import { MercadoPagoAcquirer } from './acquirers/mercado-pago.acquirer';
import { PlansController } from './plans/plans.controller';
import { PlansService } from './plans/plans.service';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { SubscriptionsService } from './subscriptions/subscriptions.service';

@Module({
  imports: [AuthModule],
  controllers: [PlansController, SubscriptionsController],
  providers: [
    MercadoPagoAcquirer,
    AcquirerRegistryService,
    PlansService,
    SubscriptionsService,
  ],
})
export class PaymentsModule {}
