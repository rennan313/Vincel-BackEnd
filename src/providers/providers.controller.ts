import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ListProvidersDto } from './dto/list-providers.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista os prestadores de serviço do escritório, paginada e com busca por nome/empresa.',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListProvidersDto,
  ) {
    return this.providersService.list(currentUser, query);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um prestador de serviço no escritório.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateProviderDto,
  ) {
    return this.providersService.create(currentUser, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita um prestador de serviço.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providersService.update(currentUser, id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reativa um prestador de serviço.' })
  activate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.providersService.setActive(currentUser, id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativa um prestador de serviço.' })
  deactivate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.providersService.setActive(currentUser, id, false);
  }
}
