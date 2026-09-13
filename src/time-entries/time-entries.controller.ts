import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ListTimeEntriesDto } from './dto/list-time-entries.dto';
import { StartTimeEntryDto } from './dto/start-time-entry.dto';
import { TimeEntriesService } from './time-entries.service';

@ApiTags('time-entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Get('active')
  @ApiOperation({
    summary: 'Retorna a atividade em andamento do usuário logado, se houver.',
  })
  getActive(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.timeEntriesService.getActive(currentUser);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista as atividades do usuário logado num dia (padrão hoje).',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListTimeEntriesDto,
  ) {
    return this.timeEntriesService.list(currentUser, query);
  }

  @Post('start')
  @ApiOperation({
    summary:
      'Inicia uma nova atividade — encerra automaticamente qualquer outra em andamento.',
  })
  start(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: StartTimeEntryDto,
  ) {
    return this.timeEntriesService.start(currentUser, dto);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pausa a atividade em andamento.' })
  pause(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.timeEntriesService.pause(currentUser, id);
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Retoma a atividade pausada.' })
  resume(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.timeEntriesService.resume(currentUser, id);
  }

  @Patch(':id/stop')
  @ApiOperation({ summary: 'Encerra a atividade.' })
  stop(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.timeEntriesService.stop(currentUser, id);
  }
}
