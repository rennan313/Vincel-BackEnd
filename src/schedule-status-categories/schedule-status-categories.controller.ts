import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateScheduleStatusCategoryDto } from './dto/create-schedule-status-category.dto';
import { UpdateScheduleStatusCategoryDto } from './dto/update-schedule-status-category.dto';
import { ScheduleStatusCategoriesService } from './schedule-status-categories.service';

@ApiTags('schedule-status-categories')
@ApiBearerAuth()
@Controller('schedule-status-categories')
export class ScheduleStatusCategoriesController {
  constructor(
    private readonly scheduleStatusCategoriesService: ScheduleStatusCategoriesService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Lista as categorias de status de cronograma do escritório (nome, cor, limite de dias de atraso) — cadastra as 3 padrão na primeira chamada, se ainda não existirem.',
  })
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.scheduleStatusCategoriesService.list(currentUser);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cria uma categoria de status de cronograma.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateScheduleStatusCategoryDto,
  ) {
    return this.scheduleStatusCategoriesService.create(currentUser, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Edita uma categoria de status de cronograma.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleStatusCategoryDto,
  ) {
    return this.scheduleStatusCategoriesService.update(currentUser, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove uma categoria de status de cronograma.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.scheduleStatusCategoriesService.remove(currentUser, id);
  }
}
