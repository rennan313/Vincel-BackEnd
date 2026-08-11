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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProjectComponentDto } from './dto/create-project-component.dto';
import { ListProjectComponentsDto } from './dto/list-project-components.dto';
import { UpdateProjectComponentDto } from './dto/update-project-component.dto';
import { ProjectComponentsService } from './project-components.service';

// GET is open to any authenticated user — the project wizard's Escopo step
// reads this catalog. Every mutation stays VINCEL_ADMIN-only (admin dashboard).
@ApiTags('project-components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project-components')
export class ProjectComponentsController {
  constructor(
    private readonly projectComponentsService: ProjectComponentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os componentes de projeto, paginada e com busca por nome.',
  })
  list(@Query() query: ListProjectComponentsDto) {
    return this.projectComponentsService.list(query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Cria um componente de projeto.' })
  create(@Body() dto: CreateProjectComponentDto) {
    return this.projectComponentsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Edita um componente de projeto.' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectComponentDto) {
    return this.projectComponentsService.update(id, dto);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Reativa um componente de projeto.' })
  activate(@Param('id') id: string) {
    return this.projectComponentsService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Desativa um componente de projeto.' })
  deactivate(@Param('id') id: string) {
    return this.projectComponentsService.setActive(id, false);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Remove (soft delete) um componente de projeto.' })
  remove(@Param('id') id: string) {
    return this.projectComponentsService.remove(id);
  }
}
