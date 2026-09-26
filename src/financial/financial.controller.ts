import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ListPayablesDto } from './dto/list-payables.dto';
import { ListReceivablesDto } from './dto/list-receivables.dto';
import { FinancialService } from './financial.service';

// Só ADMIN/FINANCE/VINCEL_ADMIN — a única tela do app restrita por papel
// hoje (dá uso real ao role FINANCE, cadastrável mas nunca antes usado
// pra restringir nada). RolesGuard não dá bypass automático a
// VINCEL_ADMIN, por isso ele está explícito aqui (mesmo padrão de
// UsersController).
@ApiTags('financial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.VINCEL_ADMIN)
@Controller('financial')
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Totais de contas a receber/pagar do escritório (pendente/atrasado).',
  })
  summary(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.financialService.summary(currentUser);
  }

  @Get('receivables')
  @ApiOperation({
    summary:
      'Lista as parcelas de honorário (a receber) de todos os projetos do escritório.',
  })
  receivables(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListReceivablesDto,
  ) {
    return this.financialService.receivables(currentUser, query);
  }

  @Get('payables')
  @ApiOperation({
    summary:
      'Lista as despesas avulsas (a pagar) de todos os projetos do escritório.',
  })
  payables(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListPayablesDto,
  ) {
    return this.financialService.payables(currentUser, query);
  }
}
