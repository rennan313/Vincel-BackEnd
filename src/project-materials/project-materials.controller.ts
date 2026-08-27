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
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { ProjectMaterialsService } from './project-materials.service';

@ApiTags('project-materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/materials')
export class ProjectMaterialsController {
  constructor(
    private readonly projectMaterialsService: ProjectMaterialsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os materiais especificados neste projeto.' })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.projectMaterialsService.list(currentUser, projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Especifica um material neste projeto.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateMaterialDto,
  ) {
    return this.projectMaterialsService.create(currentUser, projectId, dto);
  }

  @Patch(':materialId')
  @ApiOperation({ summary: 'Edita um material especificado neste projeto.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.projectMaterialsService.update(
      currentUser,
      projectId,
      materialId,
      dto,
    );
  }

  @Delete(':materialId')
  @ApiOperation({ summary: 'Remove um material deste projeto.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
  ) {
    return this.projectMaterialsService.remove(
      currentUser,
      projectId,
      materialId,
    );
  }
}
