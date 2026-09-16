import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ProjectRequestsService } from './project-requests.service';

/** Leads from the client portal's "Solicitar um projeto" button — any
 * staff role can see/dismiss these, same as the rest of the Clientes
 * screen they show up alongside. */
@ApiTags('project-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project-requests')
export class ProjectRequestsController {
  constructor(
    private readonly projectRequestsService: ProjectRequestsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as solicitações de projeto (leads) do escritório.',
  })
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.projectRequestsService.list(currentUser);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marca uma solicitação como vista.' })
  markRead(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectRequestsService.markRead(currentUser, id);
  }
}
