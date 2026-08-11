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
import { CreateProjectTypeDto } from './dto/create-project-type.dto';
import { ListProjectTypesDto } from './dto/list-project-types.dto';
import { UpdateProjectTypeDto } from './dto/update-project-type.dto';
import { ProjectTypesService } from './project-types.service';

@ApiTags('project-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VINCEL_ADMIN)
@Controller('project-types')
export class ProjectTypesController {
  constructor(private readonly projectTypesService: ProjectTypesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os tipos de projeto, paginada e com busca por nome.',
  })
  list(@Query() query: ListProjectTypesDto) {
    return this.projectTypesService.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um tipo de projeto.' })
  create(@Body() dto: CreateProjectTypeDto) {
    return this.projectTypesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita um tipo de projeto.' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectTypeDto) {
    return this.projectTypesService.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reativa um tipo de projeto.' })
  activate(@Param('id') id: string) {
    return this.projectTypesService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativa um tipo de projeto.' })
  deactivate(@Param('id') id: string) {
    return this.projectTypesService.setActive(id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove (soft delete) um tipo de projeto.' })
  remove(@Param('id') id: string) {
    return this.projectTypesService.remove(id);
  }
}
