import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get(':id/public')
  @ApiOperation({
    summary:
      'Perfil público de um escritório (nome, logo, contato) — sem autenticação, usado pela página de convite de clientes.',
  })
  getPublicProfile(@Param('id') id: string) {
    return this.companiesService.getPublicProfile(id);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Perfil completo do escritório do usuário logado.' })
  getOwnProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.companiesService.getOwnProfile(currentUser);
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Edita nome, e-mail, telefone, logo e endereço do escritório do usuário logado.',
  })
  updateOwnProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateOwnProfile(currentUser, dto);
  }
}
