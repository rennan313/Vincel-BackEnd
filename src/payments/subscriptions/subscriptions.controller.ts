import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AcquirerType, UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { GetSubscriptionQueryDto } from './dto/get-subscription-query.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Assinatura mais recente do escritório do usuário autenticado.',
  })
  findMine(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetSubscriptionQueryDto,
  ) {
    return this.subscriptionsService.findMine(currentUser, query.companyId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VINCEL_ADMIN)
  @ApiOperation({
    summary:
      'Inicia uma assinatura para o escritório; retorna a URL de checkout.',
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(currentUser, dto);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Cancela a assinatura junto ao adquirente.' })
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.cancel(currentUser, id);
  }

  // Public — called by Mercado Pago's servers, not by a logged-in user.
  // Authenticity is verified internally (x-signature) by the acquirer adapter.
  @Post('webhooks/mercado-pago')
  @ApiOperation({
    summary:
      'Recebe notificações assíncronas do Mercado Pago (assinatura verificada internamente).',
  })
  handleMercadoPagoWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    return this.subscriptionsService.handleWebhook(AcquirerType.MERCADO_PAGO, {
      headers,
      query,
      body,
    });
  }
}
