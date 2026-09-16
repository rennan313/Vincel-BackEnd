import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { CheckPublicClientEmailDto } from './dto/check-public-client-email.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { CreatePublicClientDto } from './dto/create-public-client.dto';
import { ListClientsDto } from './dto/list-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cadastra um cliente no escritório.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.create(currentUser, dto);
  }

  @Post('public')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Autocadastro público de cliente para um escritório — sem autenticação, o companyId vem no corpo.',
  })
  registerPublic(@Body() dto: CreatePublicClientDto) {
    return this.clientsService.registerPublic(dto);
  }

  @Get('public/email-exists')
  @ApiOperation({
    summary:
      'Verifica se já existe acesso de cliente (client-auth) para este e-mail, antes do autocadastro público ser enviado.',
  })
  checkPublicEmailExists(@Query() dto: CheckPublicClientEmailDto) {
    return this.clientsService.checkPublicEmailExists(dto.email);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edita um cliente.' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(currentUser, id, dto);
  }

  @Patch(':id/activate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reativa um cliente.' })
  activate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.clientsService.setActive(currentUser, id, true);
  }

  @Patch(':id/deactivate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Desativa um cliente.' })
  deactivate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.clientsService.setActive(currentUser, id, false);
  }
}
