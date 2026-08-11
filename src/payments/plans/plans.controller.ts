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
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';

// GET is open to any authenticated user — the subscription checkout flow
// needs to read the catalog. Every mutation stays VINCEL_ADMIN-only (admin dashboard).
@ApiTags('plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os planos de assinatura disponíveis.' })
  list() {
    return this.plansService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um plano pelo id.' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({
    summary: 'Cadastra um plano e o sincroniza com os adquirentes habilitados.',
  })
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Edita um plano.' })
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Reativa um plano.' })
  activate(@Param('id') id: string) {
    return this.plansService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Desativa um plano.' })
  deactivate(@Param('id') id: string) {
    return this.plansService.setActive(id, false);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Remove (soft delete) um plano.' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
