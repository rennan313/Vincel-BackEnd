import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { CompleteGoogleRegistrationDto } from './dto/complete-google-registration.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Auto credenciamento — cria o escritório (Company) e seu primeiro usuário ADMIN.',
  })
  @ApiResponse({ status: 201, description: 'Conta criada.' })
  @ApiResponse({
    status: 409,
    description: 'E-mail ou CNPJ/CPF já cadastrado.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica com e-mail e senha.' })
  @ApiResponse({ status: 200, description: 'Autenticado.' })
  @ApiResponse({ status: 401, description: 'E-mail/senha inválidos ou conta desativada.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google/complete')
  @ApiOperation({
    summary:
      'Finaliza um cadastro novo via Google, informando o documento do escritório.',
  })
  @ApiResponse({ status: 201, description: 'Conta criada.' })
  @ApiResponse({
    status: 409,
    description: 'CNPJ/CPF já cadastrado ou conta já existente.',
  })
  completeGoogleRegistration(@Body() dto: CompleteGoogleRegistrationDto) {
    return this.authService.completeGoogleRegistration(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Renova o access token a partir de um refresh token válido, rotacionando-o.',
  })
  @ApiResponse({ status: 200, description: 'Novo par de tokens.' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido, expirado ou já utilizado.',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoga o refresh token da sessão atual.' })
  @ApiResponse({ status: 204, description: 'Sessão encerrada.' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retorna o usuário autenticado.' })
  me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.me(currentUser.id);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Inicia o login/cadastro com Google.' })
  googleAuth() {
    // AuthGuard('google') redirects to Google's consent screen — never reaches here.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    try {
      const result = await this.authService.loginOrRegisterWithGoogle(
        req.user as Profile,
      );

      if (result.status === 'authenticated') {
        const redirectUrl = new URL('/auth/callback', frontendUrl);
        redirectUrl.searchParams.set('token', result.accessToken);
        redirectUrl.searchParams.set('refreshToken', result.refreshToken);
        return res.redirect(redirectUrl.toString());
      }

      const redirectUrl = new URL('/register/complete', frontendUrl);
      redirectUrl.searchParams.set('pendingToken', result.pendingToken);
      redirectUrl.searchParams.set('name', result.name);
      redirectUrl.searchParams.set('email', result.email);
      return res.redirect(redirectUrl.toString());
    } catch (error) {
      const redirectUrl = new URL('/', frontendUrl);
      redirectUrl.searchParams.set(
        'googleError',
        error instanceof Error
          ? error.message
          : 'Não foi possível continuar com Google.',
      );
      return res.redirect(redirectUrl.toString());
    }
  }
}
