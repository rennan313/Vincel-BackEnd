import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CompanyExpensesService } from './company-expenses.service';
import { CreateCompanyExpenseDto } from './dto/create-company-expense.dto';
import { ListCompanyExpensesDto } from './dto/list-company-expenses.dto';
import { UpdateCompanyExpenseDto } from './dto/update-company-expense.dto';

// Só ADMIN/FINANCE/VINCEL_ADMIN — mesma restrição do FinancialController.
// Dinheiro do próprio escritório (folha de pagamento, aluguel) é mais
// sensível que uma despesa avulsa de projeto, que hoje é aberta a
// qualquer autenticado.
@ApiTags('company-expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.FINANCE, UserRole.VINCEL_ADMIN)
@Controller('company-expenses')
export class CompanyExpensesController {
  constructor(
    private readonly companyExpensesService: CompanyExpensesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os custos do escritório (sem projeto).' })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListCompanyExpensesDto,
  ) {
    return this.companyExpensesService.list(currentUser, query);
  }

  @Post()
  @ApiOperation({ summary: 'Lança um custo do escritório (sem projeto).' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateCompanyExpenseDto,
  ) {
    return this.companyExpensesService.create(currentUser, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Edita um custo do escritório — marcar como PAID numa recorrente gera a próxima ocorrência.',
  })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyExpenseDto,
  ) {
    return this.companyExpensesService.update(currentUser, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um custo do escritório.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.companyExpensesService.remove(currentUser, id);
  }
}
