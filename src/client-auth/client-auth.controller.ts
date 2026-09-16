import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientAuthService } from './client-auth.service';
import { CurrentClient } from './decorators/current-client.decorator';
import { ClientLoginDto } from './dto/client-login.dto';
import { UpdateClientPasswordDto } from './dto/update-client-password.dto';
import { ClientJwtAuthGuard } from './guards/client-jwt-auth.guard';
import type { AuthenticatedClient } from './strategies/client-jwt.strategy';

/** Portal de cliente — autenticação e leitura própria (projetos, cadastro),
 * separada da autenticação de equipe (AuthController/vincel-api staff).
 * Sem recuperação de senha por e-mail por enquanto: quem provisiona/reseta
 * a senha de um cliente é o escritório, via PATCH /clients/:id. */
@ApiTags('client-auth')
@Controller('client-auth')
export class ClientAuthController {
  constructor(private readonly clientAuthService: ClientAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica um cliente com e-mail e senha.' })
  login(@Body() dto: ClientLoginDto) {
    return this.clientAuthService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: 'Dados de cadastro do cliente autenticado.' })
  me(@CurrentClient() currentClient: AuthenticatedClient) {
    return this.clientAuthService.me(currentClient);
  }

  @Get('me/projects')
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: 'Projetos do cliente autenticado.' })
  myProjects(@CurrentClient() currentClient: AuthenticatedClient) {
    return this.clientAuthService.myProjects(currentClient);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: 'Altera a senha do cliente autenticado.' })
  async updatePassword(
    @CurrentClient() currentClient: AuthenticatedClient,
    @Body() dto: UpdateClientPasswordDto,
  ) {
    await this.clientAuthService.updatePassword(currentClient, dto);
  }
}
