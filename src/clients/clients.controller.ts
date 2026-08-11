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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsDto } from './dto/list-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista os clientes do escritório, paginada e com busca por nome/e-mail.',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListClientsDto,
  ) {
    return this.clientsService.list(currentUser, query);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um cliente no escritório.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.create(currentUser, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita um cliente.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(currentUser, id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reativa um cliente.' })
  activate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.clientsService.setActive(currentUser, id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desativa um cliente.' })
  deactivate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.clientsService.setActive(currentUser, id, false);
  }
}
