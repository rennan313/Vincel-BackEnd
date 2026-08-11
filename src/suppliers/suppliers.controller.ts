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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

// GET is open to any authenticated user, same as Products — every mutation
// stays VINCEL_ADMIN-only (admin dashboard).
@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os fornecedores, paginada e com busca por nome.',
  })
  list(@Query() query: ListSuppliersDto) {
    return this.suppliersService.list(query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Cadastra um fornecedor.' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Edita um fornecedor.' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Reativa um fornecedor.' })
  activate(@Param('id') id: string) {
    return this.suppliersService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Desativa um fornecedor.' })
  deactivate(@Param('id') id: string) {
    return this.suppliersService.setActive(id, false);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VINCEL_ADMIN)
  @ApiOperation({ summary: 'Remove (soft delete) um fornecedor.' })
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
