import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectPdfService } from './project-pdf.service';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectPdfService: ProjectPdfService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista os projetos do escritório, paginada e com busca por nome/cliente/status.',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListProjectsDto,
  ) {
    return this.projectsService.list(currentUser, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um projeto pelo id.' })
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.findOne(currentUser, id);
  }

  @Get(':id/pdf')
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Gera e baixa o PDF do projeto.' })
  async downloadPdf(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const project = await this.projectsService.findOne(currentUser, id);
    const doc = this.projectPdfService.render(project);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${slugify(project.name)}.pdf"`,
    );
    doc.pipe(res);
    doc.end();
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um projeto no escritório.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(currentUser, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita um projeto.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(currentUser, id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reativa um projeto.' })
  activate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.setActive(currentUser, id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativa um projeto.' })
  deactivate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.setActive(currentUser, id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove (soft-delete) um projeto.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.remove(currentUser, id);
  }
}

function slugify(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics (á -> a)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || 'projeto';
}
