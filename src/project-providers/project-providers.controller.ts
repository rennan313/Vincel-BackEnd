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
import { AssignProviderDto } from './dto/assign-provider.dto';
import { UpdateProjectProviderDto } from './dto/update-project-provider.dto';
import { ProjectProvidersService } from './project-providers.service';

@ApiTags('project-providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/providers')
export class ProjectProvidersController {
  constructor(private readonly projectProvidersService: ProjectProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os prestadores vinculados a este projeto.' })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.projectProvidersService.list(currentUser, projectId);
  }

  @Post()
  @ApiOperation({
    summary:
      'Cadastra um prestador de serviço e já o vincula a este projeto.',
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: AssignProviderDto,
  ) {
    return this.projectProvidersService.create(currentUser, projectId, dto);
  }

  @Patch(':linkId')
  @ApiOperation({
    summary:
      'Edita os dados do prestador e/ou seu status e responsabilidade neste projeto.',
  })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateProjectProviderDto,
  ) {
    return this.projectProvidersService.update(currentUser, projectId, linkId, dto);
  }

  @Delete(':linkId')
  @ApiOperation({ summary: 'Remove o vínculo do prestador com este projeto.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.projectProvidersService.remove(currentUser, projectId, linkId);
  }
}
