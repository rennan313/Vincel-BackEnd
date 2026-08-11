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
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesDto } from './dto/list-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

// GET is open to any authenticated user — the project-creation wizard reads
// this catalog. Every mutation stays VINCEL_ADMIN-only (the admin dashboard).
@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os serviços, paginada e com busca por nome.',
  })
  list(@Query() query: ListServicesDto) {
    return this.servicesService.list(query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Cria um serviço.' })
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Edita um serviço.' })
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Reativa um serviço.' })
  activate(@Param('id') id: string) {
    return this.servicesService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Desativa um serviço.' })
  deactivate(@Param('id') id: string) {
    return this.servicesService.setActive(id, false);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Remove (soft delete) um serviço.' })
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
