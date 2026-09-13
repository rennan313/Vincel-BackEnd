import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AgendaTasksService } from './agenda-tasks.service';
import { CreateAgendaTaskDto } from './dto/create-agenda-task.dto';
import { ListAgendaTasksDto } from './dto/list-agenda-tasks.dto';

@ApiTags('agenda-tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agenda-tasks')
export class AgendaTasksController {
  constructor(private readonly agendaTasksService: AgendaTasksService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista as tarefas agendadas do escritório, opcionalmente filtradas por intervalo de datas.',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListAgendaTasksDto,
  ) {
    return this.agendaTasksService.list(currentUser, query);
  }

  @Post()
  @ApiOperation({ summary: 'Agenda uma nova tarefa.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateAgendaTaskDto,
  ) {
    return this.agendaTasksService.create(currentUser, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma tarefa agendada.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.agendaTasksService.remove(currentUser, id);
  }
}
