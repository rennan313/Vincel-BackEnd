import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ProjectExpensesService } from './project-expenses.service';

@ApiTags('project-expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/expenses')
export class ProjectExpensesController {
  constructor(
    private readonly projectExpensesService: ProjectExpensesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os custos avulsos lançados neste projeto.' })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.projectExpensesService.list(currentUser, projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Lança um custo avulso neste projeto.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.projectExpensesService.create(currentUser, projectId, dto);
  }

  @Patch(':expenseId')
  @ApiOperation({ summary: 'Edita um custo avulso deste projeto.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.projectExpensesService.update(
      currentUser,
      projectId,
      expenseId,
      dto,
    );
  }

  @Delete(':expenseId')
  @ApiOperation({ summary: 'Remove um custo avulso deste projeto.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.projectExpensesService.remove(
      currentUser,
      projectId,
      expenseId,
    );
  }
}
