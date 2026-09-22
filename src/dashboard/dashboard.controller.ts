import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { DashboardService } from './dashboard.service';

// Any authenticated staff role can read this — same as the rest of the
// Dashboard screen it powers, no write surface at all.
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'KPIs do escritório para o Dashboard — contagens e somas simples, sem índice/score calculado.',
  })
  summary(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.dashboardService.summary(currentUser);
  }

  @Get('charts')
  @ApiOperation({
    summary:
      'Dados para os gráficos do Dashboard — projetos por tipo e projetos/honorários dos últimos meses.',
  })
  charts(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.dashboardService.charts(currentUser);
  }
}
