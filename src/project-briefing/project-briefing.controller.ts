import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { SubmitProjectBriefingDto } from './dto/submit-project-briefing.dto';
import { ProjectBriefingService } from './project-briefing.service';

@ApiTags('project-briefing')
@Controller('projects/:projectId/briefing')
export class ProjectBriefingController {
  constructor(
    private readonly projectBriefingService: ProjectBriefingService,
  ) {}

  @Get('public')
  @ApiOperation({
    summary:
      'Contexto do brifing público de um projeto (projeto/cliente, marca do escritório, perguntas e respostas já dadas) — sem autenticação.',
  })
  getPublicContext(@Param('projectId') projectId: string) {
    return this.projectBriefingService.getPublicContext(projectId);
  }

  @Post('public')
  @ApiOperation({
    summary:
      'Envia (ou reenvia) as respostas do brifing deste projeto — sem autenticação.',
  })
  submitPublic(
    @Param('projectId') projectId: string,
    @Body() dto: SubmitProjectBriefingDto,
  ) {
    return this.projectBriefingService.submitPublic(projectId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Lê o brifing (perguntas + respostas) deste projeto.',
  })
  getForCompany(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.projectBriefingService.getForCompany(currentUser, projectId);
  }
}
